// Last-resort cover pass for Semantic Discovery albums that MusicBrainz / the Cover Art
// Archive have no art for. Uses Apple's free iTunes Search API (no key), which allows
// about 20 requests a minute, so this is slow. Only close artist + title matches are used.
//   npm run semantic:covers-itunes
import { prisma } from "../../src/lib/prisma";
import { normalizeArtist, normalizeTitle, similarity } from "../../src/lib/import-matching";

const MIN_INTERVAL_MS = 3200;
let lastCall = 0;

type ITunesResult = { artistName: string; collectionName?: string; trackName?: string; artworkUrl100?: string };

async function itunes(term: string, entity: "album" | "song") {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, entity, media: "music", limit: "10" })}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.status === 403 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 60000)); // rate limited: back off a minute
        continue;
      }
      if (!res.ok) return [];
      return ((await res.json()) as { results: ITunesResult[] }).results;
    } catch {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return [];
}

// Apple serves any size from the same path; 600x600 is plenty for album pages.
const artwork = (url: string) => url.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1");

function pick(results: ITunesResult[], artist: string, title: string, field: "collectionName" | "trackName") {
  const wantArtist = normalizeArtist(artist);
  const wantTitle = normalizeTitle(title);
  let best: { score: number; url: string } | null = null;
  for (const r of results) {
    const name = r[field];
    if (!name || !r.artworkUrl100) continue;
    const titleSim = similarity(wantTitle, normalizeTitle(name));
    const artistSim = similarity(wantArtist, normalizeArtist(r.artistName));
    if (titleSim < 0.9 || artistSim < 0.85) continue;
    const score = titleSim + artistSim;
    if (!best || score > best.score) best = { score, url: artwork(r.artworkUrl100) };
  }
  return best?.url ?? null;
}

async function main() {
  const albums = await prisma.album.findMany({
    where: { coverUrl: null, tracks: { some: { allmusicId: { not: null } } } },
    select: {
      id: true,
      title: true,
      musicbrainzId: true,
      artist: { select: { name: true } },
      tracks: { where: { allmusicId: { not: null } }, select: { title: true }, take: 2 },
    },
  });
  console.log(`${albums.length} albums without a cover (≈${Math.ceil((albums.length * 1.5 * MIN_INTERVAL_MS) / 60000)} min)`);

  let found = 0;
  for (const [i, album] of albums.entries()) {
    const artist = album.artist.name;
    let url: string | null = null;

    // Real albums: look the album up by name first.
    if (album.musicbrainzId) {
      url = pick(await itunes(`${artist} ${album.title}`, "album"), artist, album.title, "collectionName");
    }
    // Otherwise (or if that failed) use the artwork of the album the song appears on.
    for (const track of album.tracks) {
      if (url) break;
      url = pick(await itunes(`${artist} ${track.title}`, "song"), artist, track.title, "trackName");
    }

    if (url) {
      await prisma.album.update({ where: { id: album.id }, data: { coverUrl: url } });
      found += 1;
    }
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${albums.length} checked · ${found} covers found`);
  }
  const remaining = await prisma.album.count({ where: { coverUrl: null, tracks: { some: { allmusicId: { not: null } } } } });
  console.log(`Done: ${found} covers found on iTunes; ${remaining} albums still have no cover.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
