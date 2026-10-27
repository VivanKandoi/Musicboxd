// Step B of the Semantic Discovery import: put the 1,844 MERGE songs into the catalogue and
// attach their embeddings. Local and fast; uses the MusicBrainz matches cached by
// `npm run semantic:resolve`. Idempotent (keyed on AllMusic ID), so re-run it after more
// songs resolve. No lyrics or review text are stored — only vectors and metadata.
//   npm run semantic:import
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { normalizeTitle } from "../../src/lib/import-matching";
import type { Resolution } from "./resolve-musicbrainz";

const BUNDLE = "prisma/data/semantic";
const SPACES = [
  { space: "lyrics", file: "lyrics.f32", dim: 384 },
  { space: "reviews", file: "reviews.f32", dim: 384 },
  { space: "audio", file: "audio.f32", dim: 512 },
] as const;

type Song = {
  id: string;
  artist: string;
  title: string;
  quadrant: string;
  year: number | null;
  durationSec: number | null;
  valence: number | null;
  arousal: number | null;
  genres: string[];
  styles: string[];
  moods: string[];
  themes: string[];
};

function parseDate(date: string | null) {
  if (!date) return null;
  const full = /^\d{4}$/.test(date) ? `${date}-01-01` : /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date;
  const d = new Date(`${full}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findOrCreateArtist(name: string, mbid: string | null) {
  if (mbid) {
    const byMbid = await prisma.artist.findUnique({ where: { musicbrainzId: mbid } });
    if (byMbid) return byMbid;
  }
  const byName = await prisma.artist.findFirst({ where: { name } });
  if (byName) {
    return mbid && !byName.musicbrainzId
      ? prisma.artist.update({ where: { id: byName.id }, data: { musicbrainzId: mbid } })
      : byName;
  }
  return prisma.artist.create({ data: { name, musicbrainzId: mbid } });
}

async function findOrCreateAlbum(song: Song, res: Resolution, artistId: string) {
  if (res.status === "matched") {
    const rg = res.releaseGroup;
    const existing = await prisma.album.findUnique({ where: { musicbrainzId: rg.mbid } });
    if (existing) return existing;
    return prisma.album.create({
      data: {
        title: rg.title,
        artistId,
        musicbrainzId: rg.mbid,
        releaseDate: parseDate(rg.date),
        releaseGroupType: rg.type === "Compilation" ? "Album" : rg.type,
      },
    });
  }
  // No confident MusicBrainz match: the song gets a single of its own, without a cover.
  const existing = await prisma.album.findFirst({
    where: { artistId, title: song.title, musicbrainzId: null, releaseGroupType: "Single" },
  });
  return (
    existing ??
    prisma.album.create({
      data: {
        title: song.title,
        artistId,
        releaseGroupType: "Single",
        releaseDate: song.year ? new Date(Date.UTC(song.year, 0, 1)) : null,
      },
    })
  );
}

async function addAlbumGenres(albumId: string, song: Song) {
  if ((await prisma.albumGenre.count({ where: { albumId } })) > 0) return;
  const names = (song.styles.length ? song.styles : song.genres).slice(0, 2);
  for (const name of names) {
    const genre = await prisma.genre.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.albumGenre.upsert({
      where: { albumId_genreId: { albumId, genreId: genre.id } },
      update: {},
      create: { albumId, genreId: genre.id },
    });
  }
}

async function main() {
  const { songs } = JSON.parse(readFileSync(`${BUNDLE}/songs.json`, "utf8")) as { songs: Song[] };
  const cachePath = `${BUNDLE}/musicbrainz.json`;
  const resolutions: Record<string, Resolution> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
  const vectors = SPACES.map(({ space, file, dim }) => {
    const buf = readFileSync(`${BUNDLE}/${file}`);
    if (buf.length !== songs.length * dim * 4) throw new Error(`${file} has the wrong size for ${songs.length} songs`);
    return { space, dim, buf };
  });

  const includeUnresolved = process.argv.includes("--include-unresolved");
  let created = 0;
  let updated = 0;
  let moved = 0;
  let skipped = 0;

  for (const [row, song] of songs.entries()) {
    const res: Resolution | undefined =
      resolutions[song.id] ?? (includeUnresolved ? { status: "unmatched", reason: "not resolved yet" } : undefined);
    if (!res) {
      skipped += 1;
      continue;
    }

    const artist = await findOrCreateArtist(
      res.status === "matched" ? res.artist.name : song.artist,
      res.status === "matched" ? res.artist.mbid : null
    );
    const album = await findOrCreateAlbum(song, res, artist.id);

    const semantic = {
      allmusicId: song.id,
      quadrant: song.quadrant,
      valence: song.valence,
      arousal: song.arousal,
      songTags: { year: song.year, moods: song.moods, themes: song.themes, styles: song.styles, genres: song.genres },
    };

    let track = await prisma.track.findUnique({ where: { allmusicId: song.id } });
    if (track && track.albumId !== album.id) {
      // Previously a placeholder single; now resolved to a real album.
      const oldAlbumId = track.albumId;
      track = await prisma.track.update({
        where: { id: track.id },
        data: {
          albumId: album.id,
          musicbrainzId: res.status === "matched" ? res.recordingMbid : track.musicbrainzId,
          trackNumber: res.status === "matched" && res.trackNumber ? res.trackNumber : track.trackNumber,
        },
      });
      const remaining = await prisma.track.count({ where: { albumId: oldAlbumId } });
      const oldAlbum = await prisma.album.findUnique({ where: { id: oldAlbumId }, include: { _count: { select: { logs: true } } } });
      if (remaining === 0 && oldAlbum && !oldAlbum.musicbrainzId && oldAlbum._count.logs === 0) {
        await prisma.album.delete({ where: { id: oldAlbumId } });
      }
      moved += 1;
    }
    if (!track) {
      // Reuse a track already in the album (e.g. imported earlier from MusicBrainz).
      const albumTracks = await prisma.track.findMany({ where: { albumId: album.id, allmusicId: null } });
      const wanted = normalizeTitle(song.title);
      track =
        (res.status === "matched" && albumTracks.find((t) => t.musicbrainzId === res.recordingMbid)) ||
        albumTracks.find((t) => normalizeTitle(t.title) === wanted) ||
        null;
      if (track) {
        track = await prisma.track.update({ where: { id: track.id }, data: semantic });
        updated += 1;
      } else {
        track = await prisma.track.create({
          data: {
            ...semantic,
            albumId: album.id,
            title: song.title,
            trackNumber: (res.status === "matched" && res.trackNumber) || albumTracks.length + 1,
            durationSec: song.durationSec,
            musicbrainzId: res.status === "matched" ? res.recordingMbid : null,
          },
        });
        created += 1;
      }
    } else {
      track = await prisma.track.update({ where: { id: track.id }, data: semantic });
      updated += 1;
    }

    await prisma.$transaction(
      vectors.map(({ space, dim, buf }) => {
        const vector = Uint8Array.from(buf.subarray(row * dim * 4, (row + 1) * dim * 4));
        return prisma.trackEmbedding.upsert({
          where: { trackId_space: { trackId: track!.id, space } },
          update: { dim, vector },
          create: { trackId: track!.id, space, dim, vector },
        });
      })
    );
    await addAlbumGenres(album.id, song);

    const done = created + updated;
    if (done % 200 === 0) console.log(`  ${done} songs imported…`);
  }

  const total = await prisma.trackEmbedding.count({ where: { space: "lyrics" } });
  console.log(
    `Done: ${created} new tracks, ${updated} updated, ${moved} moved to their real album, ${skipped} waiting for MusicBrainz resolution. ${total} songs searchable.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
