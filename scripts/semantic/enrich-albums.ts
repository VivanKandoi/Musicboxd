// Step C of the Semantic Discovery import: give the albums created for MERGE songs their full
// tracklist and cover art from MusicBrainz / the Cover Art Archive. Slow (~1.5 s per album)
// and resumable: albums that already have their full tracklist are skipped.
//   npm run semantic:enrich
import { readFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { caaCover, mbGet } from "../../src/lib/musicbrainz";
import { normalizeTitle } from "../../src/lib/import-matching";
import type { Resolution } from "./resolve-musicbrainz";

type ReleaseDetail = {
  media?: { tracks?: { title: string; number: string; position: number; length?: number; recording?: { id: string } }[] }[];
};

async function main() {
  const cache = JSON.parse(readFileSync("prisma/data/semantic/musicbrainz.json", "utf8")) as Record<string, Resolution>;
  const releaseByAllmusic = new Map(
    Object.entries(cache).flatMap(([id, r]) => (r.status === "matched" ? [[id, r.releaseMbid] as const] : []))
  );

  // Albums that only contain MERGE songs so far (no tracklist imported yet).
  const albums = await prisma.album.findMany({
    where: { musicbrainzId: { not: null }, tracks: { some: { allmusicId: { not: null } }, none: { allmusicId: null } } },
    select: { id: true, title: true, musicbrainzId: true, coverUrl: true, tracks: { select: { id: true, allmusicId: true, title: true, musicbrainzId: true } } },
  });
  console.log(`${albums.length} albums to enrich`);

  let done = 0;
  let covers = 0;
  for (const album of albums) {
    const releaseMbid = album.tracks.map((t) => releaseByAllmusic.get(t.allmusicId!)).find(Boolean);
    if (!releaseMbid) continue;

    const detail = await mbGet<ReleaseDetail>(`/release/${releaseMbid}?inc=recordings&fmt=json`);
    const tracks = detail?.media?.flatMap((m) => m.tracks ?? []) ?? [];
    let position = 0;
    for (const t of tracks) {
      position += 1;
      const number = Number(t.number) || position;
      const existing = album.tracks.find(
        (s) => (t.recording && s.musicbrainzId === t.recording.id) || normalizeTitle(s.title) === normalizeTitle(t.title)
      );
      if (existing) {
        await prisma.track.update({ where: { id: existing.id }, data: { trackNumber: number } });
      } else {
        await prisma.track.create({
          data: {
            albumId: album.id,
            title: t.title,
            trackNumber: number,
            durationSec: t.length ? Math.round(t.length / 1000) : null,
            musicbrainzId: t.recording?.id ?? null,
          },
        });
      }
    }

    if (!album.coverUrl) {
      const url = (await caaCover(`release/${releaseMbid}`)) ?? (await caaCover(`release-group/${album.musicbrainzId}`));
      if (url) {
        await prisma.album.update({ where: { id: album.id }, data: { coverUrl: url } });
        covers += 1;
      }
    }
    done += 1;
    if (done % 50 === 0) console.log(`${done}/${albums.length} albums · ${covers} covers found`);
  }
  console.log(`Done: ${done} albums enriched, ${covers} covers found.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
