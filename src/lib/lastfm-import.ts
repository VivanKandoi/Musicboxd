import { prisma } from "@/lib/prisma";
import { getRecentTracksPage, getTopAlbums, getUserInfo, LastfmError } from "@/lib/lastfm";
import { buildMatcher, normalizeArtist, normalizeTitle } from "@/lib/import-matching";
import { dayKey, invalidateYearStats } from "@/lib/year-in-review";

const HISTORY_DAYS = 365;
const MAX_SCROBBLE_PAGES = 25; // 200 per page -> up to 5,000 scrobbles
const TOP_ALBUM_LIMIT = 200;

export type DailyPlays = { day: string; plays: number };

type Aggregated = {
  artist: string;
  album: string;
  albumMbid: string | null;
  artistMbid: string | null;
  days: Map<string, number>;
  allTimePlays: number;
};

async function updateJob(jobId: string, data: Parameters<typeof prisma.importJob.update>[0]["data"]) {
  await prisma.importJob.update({ where: { id: jobId }, data });
}

// Writes unrated "imported listens": one row per album per day it was played, plus one
// undated row for any all-time plays that fall outside the dated window. importKey makes
// re-imports update rows instead of duplicating them. Never writes ratings.
export async function saveImportedListens(
  userId: string,
  albumId: string,
  days: DailyPlays[],
  allTimePlays: number
) {
  const datedPlays = days.reduce((sum, d) => sum + d.plays, 0);
  const undatedPlays = Math.max(0, allTimePlays - datedPlays);
  const now = new Date();

  const ops = days.map(({ day, plays }) => {
    const listenedAt = new Date(`${day}T12:00:00Z`);
    return prisma.log.upsert({
      where: { importKey: `lastfm:${userId}:${albumId}:${day}` },
      update: { playCount: plays },
      create: {
        userId,
        albumId,
        source: "lastfm",
        playCount: plays,
        listenedAt,
        createdAt: listenedAt,
        importKey: `lastfm:${userId}:${albumId}:${day}`,
      },
    });
  });
  if (undatedPlays > 0) {
    ops.push(
      prisma.log.upsert({
        where: { importKey: `lastfm:${userId}:${albumId}:alltime` },
        update: { playCount: undatedPlays },
        create: {
          userId,
          albumId,
          source: "lastfm",
          undated: true,
          playCount: undatedPlays,
          listenedAt: now,
          createdAt: now,
          importKey: `lastfm:${userId}:${albumId}:alltime`,
        },
      })
    );
  }
  await prisma.$transaction(ops);
  return ops.length;
}

export async function runLastfmImport(jobId: string) {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const { userId, externalUser } = job;

  try {
    await updateJob(jobId, { status: "running", stage: "Checking your Last.fm profile" });
    await getUserInfo(externalUser);

    const albums = new Map<string, Aggregated>();
    const keyOf = (artist: string, album: string) => `${normalizeArtist(artist)}|${normalizeTitle(album)}`;
    const entryFor = (e: { artist: string; album: string; albumMbid: string | null; artistMbid: string | null }) => {
      const key = keyOf(e.artist, e.album);
      let entry = albums.get(key);
      if (!entry) {
        entry = { ...e, days: new Map(), allTimePlays: 0 };
        albums.set(key, entry);
      }
      entry.albumMbid ??= e.albumMbid;
      entry.artistMbid ??= e.artistMbid;
      return entry;
    };

    const from = Math.floor((Date.now() - HISTORY_DAYS * 86400000) / 1000);
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, MAX_SCROBBLE_PAGES); page++) {
      await updateJob(jobId, {
        stage: `Fetching scrobbles (page ${page} of ${Math.min(totalPages, MAX_SCROBBLE_PAGES)})`,
      });
      const result = await getRecentTracksPage(externalUser, page, from);
      totalPages = result.totalPages;
      for (const s of result.scrobbles) {
        const entry = entryFor(s);
        const day = dayKey(s.playedAt);
        entry.days.set(day, (entry.days.get(day) ?? 0) + 1);
      }
    }

    await updateJob(jobId, { stage: "Fetching your top albums" });
    for (const a of await getTopAlbums(externalUser, TOP_ALBUM_LIMIT)) {
      const entry = entryFor(a);
      entry.allTimePlays = Math.max(entry.allTimePlays, a.playCount);
    }

    await updateJob(jobId, { stage: "Matching albums to the catalog", total: albums.size });
    const catalog = await prisma.album.findMany({
      select: {
        id: true,
        title: true,
        musicbrainzId: true,
        artist: { select: { id: true, name: true, musicbrainzId: true } },
      },
    });
    const match = buildMatcher(catalog);

    // A previous import's pending review items are superseded by this run.
    await prisma.importReviewItem.deleteMany({ where: { userId, status: "pending" } });

    let processed = 0;
    let matched = 0;
    let queued = 0;
    let unmatched = 0;
    let listensCreated = 0;

    for (const entry of albums.values()) {
      const days = [...entry.days.entries()]
        .map(([day, plays]) => ({ day, plays }))
        .sort((a, b) => a.day.localeCompare(b.day));
      const datedPlays = days.reduce((s, d) => s + d.plays, 0);
      const allTimePlays = Math.max(entry.allTimePlays, datedPlays);
      const result = match(entry);

      if (result.status === "matched") {
        listensCreated += await saveImportedListens(userId, result.albumId, days, allTimePlays);
        matched += 1;
      } else if (result.status === "review") {
        await prisma.importReviewItem.create({
          data: {
            jobId,
            userId,
            artistName: entry.artist,
            albumTitle: entry.album,
            playCount: allTimePlays,
            listens: days,
            candidates: result.candidates,
          },
        });
        queued += 1;
      } else {
        unmatched += 1;
      }

      processed += 1;
      if (processed % 10 === 0 || processed === albums.size) {
        await updateJob(jobId, { processed, matched, queued, unmatched, listensCreated });
      }
    }

    await invalidateYearStats(userId);
    await updateJob(jobId, {
      status: "done",
      stage: null,
      processed,
      matched,
      queued,
      unmatched,
      listensCreated,
      finishedAt: new Date(),
    });
  } catch (e) {
    const message = e instanceof LastfmError ? e.message : "The import failed unexpectedly";
    if (!(e instanceof LastfmError)) console.error("Last.fm import failed", e);
    await updateJob(jobId, { status: "failed", stage: null, error: message, finishedAt: new Date() });
  }
}

// A job whose process died (e.g. dev server restart) would otherwise stay "running" forever.
const STALE_AFTER_MS = 15 * 60 * 1000;

export async function failStaleJobs(userId: string) {
  await prisma.importJob.updateMany({
    where: {
      userId,
      status: { in: ["pending", "running"] },
      createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    data: { status: "failed", stage: null, error: "The import stopped before finishing; please run it again", finishedAt: new Date() },
  });
}
