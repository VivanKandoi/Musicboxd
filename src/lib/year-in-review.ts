import { prisma } from "@/lib/prisma";

// All year boundaries and day keys are UTC so a recount gives the same answer on any server.

export type YearAlbum = {
  albumId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  listens: number;
  avgRating: number | null;
};

export type YearStatsData = {
  year: number;
  totalListens: number;
  totalPlays: number;
  uniqueAlbums: number;
  uniqueArtists: number;
  reviewsWritten: number;
  importedListens: number;
  topAlbums: YearAlbum[];
  topArtists: { name: string; listens: number }[];
  topGenres: { name: string; albums: number }[];
  genresExplored: number;
  ratingDistribution: { rating: number; count: number }[];
  ratedCount: number;
  avgRating: number | null;
  monthly: number[];
  busiestMonth: { month: number; listens: number } | null;
  longestStreak: { days: number; start: string; end: string } | null;
  topContexts: { name: string; count: number }[];
  firstListen: { albumId: string; title: string; artist: string; date: string } | null;
};

export function yearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function longestStreak(dayKeys: Iterable<string>) {
  const days = [...new Set(dayKeys)].sort();
  if (days.length === 0) return null;

  let best = { days: 1, start: days[0], end: days[0] };
  let runStart = days[0];
  let runLength = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (Date.parse(days[i]) - Date.parse(days[i - 1])) / 86400000;
    if (gap === 1) {
      runLength += 1;
    } else {
      runStart = days[i];
      runLength = 1;
    }
    if (runLength > best.days) best = { days: runLength, start: runStart, end: days[i] };
  }
  return best;
}

export async function computeYearStats(userId: string, year: number): Promise<YearStatsData> {
  const logs = await prisma.log.findMany({
    where: { userId, undated: false, listenedAt: yearRange(year) },
    orderBy: { listenedAt: "asc" },
    select: {
      albumId: true,
      rating: true,
      reviewText: true,
      listenedAt: true,
      source: true,
      playCount: true,
      album: {
        select: {
          title: true,
          coverUrl: true,
          artist: { select: { name: true } },
          genres: { select: { genre: { select: { name: true } } } },
        },
      },
      contextTags: { select: { tag: { select: { name: true } } } },
    },
  });

  const byAlbum = new Map<
    string,
    { title: string; artist: string; coverUrl: string | null; listens: number; ratings: number[] }
  >();
  const byArtist = new Map<string, number>();
  const albumsPerGenre = new Map<string, Set<string>>();
  const contexts = new Map<string, number>();
  const monthly = Array<number>(12).fill(0);
  const ratingBuckets = new Map<number, number>();
  const days: string[] = [];
  let totalPlays = 0;
  let reviewsWritten = 0;
  let importedListens = 0;

  for (const log of logs) {
    const album = byAlbum.get(log.albumId) ?? {
      title: log.album.title,
      artist: log.album.artist.name,
      coverUrl: log.album.coverUrl,
      listens: 0,
      ratings: [],
    };
    album.listens += 1;
    if (log.rating != null) album.ratings.push(log.rating);
    byAlbum.set(log.albumId, album);

    byArtist.set(log.album.artist.name, (byArtist.get(log.album.artist.name) ?? 0) + 1);
    for (const { genre } of log.album.genres) {
      const set = albumsPerGenre.get(genre.name) ?? new Set<string>();
      set.add(log.albumId);
      albumsPerGenre.set(genre.name, set);
    }
    for (const { tag } of log.contextTags) {
      contexts.set(tag.name, (contexts.get(tag.name) ?? 0) + 1);
    }

    monthly[log.listenedAt.getUTCMonth()] += 1;
    days.push(dayKey(log.listenedAt));
    totalPlays += log.playCount ?? 1;
    if (log.reviewText) reviewsWritten += 1;
    if (log.source !== "manual") importedListens += 1;
    if (log.rating != null) {
      ratingBuckets.set(log.rating, (ratingBuckets.get(log.rating) ?? 0) + 1);
    }
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const topAlbums = [...byAlbum.entries()]
    .map(([albumId, a]) => ({
      albumId,
      title: a.title,
      artist: a.artist,
      coverUrl: a.coverUrl,
      listens: a.listens,
      avgRating: avg(a.ratings),
    }))
    .sort(
      (a, b) =>
        b.listens - a.listens ||
        (b.avgRating ?? 0) - (a.avgRating ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, 5);

  const rated = logs.filter((l) => l.rating != null).map((l) => l.rating as number);
  const busiestIndex = monthly.reduce((best, n, i) => (n > monthly[best] ? i : best), 0);

  return {
    year,
    totalListens: logs.length,
    totalPlays,
    uniqueAlbums: byAlbum.size,
    uniqueArtists: byArtist.size,
    reviewsWritten,
    importedListens,
    topAlbums,
    topArtists: [...byArtist.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, listens]) => ({ name, listens })),
    topGenres: [...albumsPerGenre.entries()]
      .map(([name, set]) => ({ name, albums: set.size }))
      .sort((a, b) => b.albums - a.albums || a.name.localeCompare(b.name))
      .slice(0, 6),
    genresExplored: albumsPerGenre.size,
    ratingDistribution: Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map((rating) => ({
      rating,
      count: ratingBuckets.get(rating) ?? 0,
    })),
    ratedCount: rated.length,
    avgRating: avg(rated),
    monthly,
    busiestMonth: logs.length ? { month: busiestIndex, listens: monthly[busiestIndex] } : null,
    longestStreak: longestStreak(days),
    topContexts: [...contexts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    firstListen: logs[0]
      ? {
          albumId: logs[0].albumId,
          title: logs[0].album.title,
          artist: logs[0].album.artist.name,
          date: dayKey(logs[0].listenedAt),
        }
      : null,
  };
}

export async function refreshYearStats(userId: string, year: number) {
  const data = await computeYearStats(userId, year);
  await prisma.yearStats.upsert({
    where: { userId_year: { userId, year } },
    update: { data, computedAt: new Date() },
    create: { userId, year, data },
  });
  return data;
}

const CURRENT_YEAR_MAX_AGE_MS = 60 * 60 * 1000;

// Reads the precomputed row (filled by `npm run jobs:year-stats`), computing it on demand
// if the job hasn't run yet. The in-progress year is refreshed at most hourly.
export async function getYearStats(userId: string, year: number) {
  const row = await prisma.yearStats.findUnique({ where: { userId_year: { userId, year } } });
  const isCurrentYear = year === new Date().getUTCFullYear();
  const stale = row && isCurrentYear && Date.now() - row.computedAt.getTime() > CURRENT_YEAR_MAX_AGE_MS;
  if (row && !stale) return row.data as unknown as YearStatsData;
  return refreshYearStats(userId, year);
}

export async function invalidateYearStats(userId: string, years?: number[]) {
  await prisma.yearStats.deleteMany({
    where: { userId, ...(years ? { year: { in: years } } : {}) },
  });
}

export async function getYearsWithListens(userId: string) {
  const rows = await prisma.log.findMany({
    where: { userId, undated: false },
    select: { listenedAt: true },
  });
  return [...new Set(rows.map((r) => r.listenedAt.getUTCFullYear()))].sort((a, b) => b - a);
}
