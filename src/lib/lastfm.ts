// Minimal client for the public Last.fm API (https://www.last.fm/api).
// Last.fm asks for at most ~5 requests/second per key, so calls are spaced out.

const API_URL = "https://ws.audioscrobbler.com/2.0/";
const MIN_INTERVAL_MS = 250;

export class LastfmError extends Error {
  constructor(
    message: string,
    readonly code?: number
  ) {
    super(message);
  }
}

export function lastfmConfigured() {
  return Boolean(process.env.LASTFM_API_KEY);
}

let lastCall = 0;

async function call<T>(method: string, params: Record<string, string | number>): Promise<T> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new LastfmError("Last.fm import isn't configured (LASTFM_API_KEY is not set)");

  const url = new URL(API_URL);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();

    const res = await fetch(url, {
      headers: { "User-Agent": "MusicBoxd/0.1 (capstone project)" },
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => null)) as
      | (T & { error?: number; message?: string })
      | null;

    // 29 = rate limited, 8/16 = temporary backend errors: back off and retry.
    const retryable = res.status >= 500 || body?.error === 29 || body?.error === 8 || body?.error === 16;
    if (retryable && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!body) throw new LastfmError(`Last.fm returned an unreadable response (HTTP ${res.status})`);
    if (body.error) {
      const message =
        body.error === 6
          ? "No Last.fm user with that name"
          : body.error === 17
            ? "That Last.fm profile hides its listening history"
            : body.error === 10 || body.error === 26
              ? "The Last.fm API key is invalid or suspended"
              : body.message || `Last.fm error ${body.error}`;
      throw new LastfmError(message, body.error);
    }
    return body;
  }
  throw new LastfmError("Last.fm kept rate-limiting the import; try again in a few minutes");
}

type Named = { "#text"?: string; name?: string; mbid?: string };

export type LastfmScrobble = {
  artist: string;
  artistMbid: string | null;
  album: string;
  albumMbid: string | null;
  playedAt: Date;
};

export type LastfmTopAlbum = {
  artist: string;
  artistMbid: string | null;
  album: string;
  albumMbid: string | null;
  playCount: number;
};

const asArray = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const mbidOrNull = (m?: string) => (m && m.trim() ? m.trim() : null);

export async function getUserInfo(user: string) {
  const data = await call<{ user: { name: string; playcount: string } }>("user.getinfo", { user });
  return { name: data.user.name, playCount: Number(data.user.playcount) || 0 };
}

export async function getRecentTracksPage(user: string, page: number, from: number) {
  const data = await call<{
    recenttracks: {
      track?:
        | Array<{ artist: Named; album: Named; date?: { uts: string }; "@attr"?: { nowplaying?: string } }>
        | { artist: Named; album: Named; date?: { uts: string }; "@attr"?: { nowplaying?: string } };
      "@attr": { totalPages: string; total: string };
    };
  }>("user.getrecenttracks", { user, page, from, limit: 200 });

  const scrobbles: LastfmScrobble[] = [];
  for (const t of asArray(data.recenttracks.track)) {
    if (t["@attr"]?.nowplaying || !t.date?.uts) continue;
    const album = t.album?.["#text"]?.trim();
    const artist = t.artist?.["#text"]?.trim() || t.artist?.name?.trim();
    if (!album || !artist) continue;
    scrobbles.push({
      artist,
      artistMbid: mbidOrNull(t.artist.mbid),
      album,
      albumMbid: mbidOrNull(t.album.mbid),
      playedAt: new Date(Number(t.date.uts) * 1000),
    });
  }
  return {
    scrobbles,
    totalPages: Number(data.recenttracks["@attr"].totalPages) || 0,
    total: Number(data.recenttracks["@attr"].total) || 0,
  };
}

export async function getTopAlbums(user: string, limit: number) {
  const data = await call<{
    topalbums: {
      album?: Array<{ name: string; playcount: string; mbid?: string; artist: Named }>;
    };
  }>("user.gettopalbums", { user, period: "overall", limit });

  return asArray(data.topalbums.album)
    .map(
      (a): LastfmTopAlbum => ({
        artist: (a.artist?.name ?? a.artist?.["#text"] ?? "").trim(),
        artistMbid: mbidOrNull(a.artist?.mbid),
        album: a.name?.trim() ?? "",
        albumMbid: mbidOrNull(a.mbid),
        playCount: Number(a.playcount) || 0,
      })
    )
    .filter((a) => a.artist && a.album && a.playCount > 0);
}
