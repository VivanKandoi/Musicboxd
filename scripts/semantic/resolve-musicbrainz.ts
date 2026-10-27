// Step A of the Semantic Discovery import: find each MERGE song on MusicBrainz and pick the
// album it should live on in the catalogue. Slow (about 1 request/second, MusicBrainz's
// limit), so results are cached in prisma/data/semantic/musicbrainz.json and the script
// resumes where it stopped.
//   npm run semantic:resolve
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { mbGet } from "../../src/lib/musicbrainz";
import { normalizeArtist, normalizeTitle, similarity } from "../../src/lib/import-matching";

const BUNDLE = "prisma/data/semantic";
const CACHE = `${BUNDLE}/musicbrainz.json`;

type Song = { id: string; artist: string; title: string; year: number | null };

type MBSearchRecording = {
  id: string;
  title: string;
  score: number;
  "artist-credit"?: { name: string; artist: { id: string; name: string } }[];
  releases?: {
    id: string;
    title: string;
    status?: string;
    date?: string;
    "release-group"?: { id: string; title?: string; "primary-type"?: string; "secondary-types"?: string[] };
    media?: { position: number; track?: { number: string; position: number }[] }[];
  }[];
};

export type Resolution =
  | {
      status: "matched";
      artist: { mbid: string; name: string };
      recordingMbid: string;
      releaseGroup: { mbid: string; title: string; type: "Album" | "EP" | "Single" | "Compilation"; date: string | null };
      releaseMbid: string;
      trackNumber: number | null;
      confidence: number;
    }
  | { status: "unmatched"; reason: string };

// Lucene special characters must be escaped inside quoted MusicBrainz search terms.
const esc = (s: string) => s.replace(/(["\\])/g, "\\$1");

function releaseRank(type: string | undefined, secondary: string[] | undefined, status: string | undefined) {
  let rank = 0;
  if (type === "Album" && !secondary?.length) rank = 4;
  else if (type === "EP" && !secondary?.length) rank = 3;
  else if (type === "Single") rank = 2;
  else if (secondary?.includes("Compilation")) rank = 1;
  if (status === "Official") rank += 0.5;
  return rank;
}

async function resolve(song: Song): Promise<Resolution> {
  const query = `recording:"${esc(song.title)}" AND artist:"${esc(song.artist)}"`;
  const data = await mbGet<{ recordings: MBSearchRecording[] }>(
    `/recording?query=${encodeURIComponent(query)}&fmt=json&limit=15`
  );
  if (!data) return { status: "unmatched", reason: "lookup failed" };

  const wantTitle = normalizeTitle(song.title);
  const wantArtist = normalizeArtist(song.artist);
  let best: { rank: number; date: string; confidence: number; res: Extract<Resolution, { status: "matched" }> } | null = null;

  for (const rec of data.recordings ?? []) {
    const credit = rec["artist-credit"]?.[0];
    if (!credit) continue;
    const titleSim = similarity(wantTitle, normalizeTitle(rec.title));
    const artistSim = Math.max(
      similarity(wantArtist, normalizeArtist(credit.artist.name)),
      similarity(wantArtist, normalizeArtist(credit.name))
    );
    if (titleSim < 0.85 || artistSim < 0.8) continue;
    const confidence = 0.6 * titleSim + 0.4 * artistSim;

    for (const rel of rec.releases ?? []) {
      const rg = rel["release-group"];
      if (!rg) continue;
      const rank = releaseRank(rg["primary-type"], rg["secondary-types"], rel.status);
      if (rank === 0) continue; // live albums, soundtracks without a primary type, etc.
      const date = rel.date ?? "9999";
      const better =
        !best ||
        rank > best.rank ||
        (rank === best.rank && confidence > best.confidence + 0.05) ||
        (rank === best.rank && Math.abs(confidence - best.confidence) <= 0.05 && date < best.date);
      if (!better) continue;
      const track = rel.media?.flatMap((m) => m.track ?? [])[0];
      const type = rg["secondary-types"]?.includes("Compilation")
        ? "Compilation"
        : rg["primary-type"] === "EP"
          ? "EP"
          : rg["primary-type"] === "Single"
            ? "Single"
            : "Album";
      best = {
        rank,
        date,
        confidence,
        res: {
          status: "matched",
          artist: { mbid: credit.artist.id, name: credit.artist.name },
          recordingMbid: rec.id,
          releaseGroup: { mbid: rg.id, title: rg.title ?? rel.title, type, date: rel.date ?? null },
          releaseMbid: rel.id,
          trackNumber: track ? Number(track.number) || track.position || null : null,
          confidence: Math.round(confidence * 100) / 100,
        },
      };
    }
  }
  return best?.res ?? { status: "unmatched", reason: "no confident match" };
}

async function main() {
  const { songs } = JSON.parse(readFileSync(`${BUNDLE}/songs.json`, "utf8")) as { songs: Song[] };
  const cache: Record<string, Resolution> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const retryFailed = process.argv.includes("--retry-failed");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const todo = songs
    .filter((s) => {
      const prev = cache[s.id];
      return !prev || (retryFailed && prev.status === "unmatched" && prev.reason === "lookup failed");
    })
    .slice(0, limitArg ? Number(limitArg.split("=")[1]) : undefined);
  console.log(`${songs.length} songs, ${Object.keys(cache).length} cached, resolving ${todo.length} now`);

  let done = 0;
  for (const song of todo) {
    cache[song.id] = await resolve(song);
    done += 1;
    if (done % 25 === 0 || done === todo.length) {
      writeFileSync(CACHE, JSON.stringify(cache, null, 1));
      const matched = Object.values(cache).filter((r) => r.status === "matched").length;
      console.log(`${done}/${todo.length} resolved this run · ${matched}/${Object.keys(cache).length} matched overall`);
    }
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
