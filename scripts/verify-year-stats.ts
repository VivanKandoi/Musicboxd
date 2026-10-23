// Evaluation check from the Tier 3 plan: year-in-review must match a manual recount for
// three seeded users. The recount here is plain SQL plus a separate streak loop, so it
// shares no code with src/lib/year-in-review.ts.
//   npm run eval:year-stats            -> 2025
//   npm run eval:year-stats -- 2024
import { prisma } from "../src/lib/prisma";
import { getYearStats, type YearStatsData } from "../src/lib/year-in-review";

const USERS = ["vivan", "samarpana", "saivya"];

type Row = Record<string, number | bigint | string | null>;
const num = (v: unknown) => (v == null ? 0 : Number(v));

async function recount(userId: string, year: number) {
  const from = Date.UTC(year, 0, 1);
  const to = Date.UTC(year + 1, 0, 1);
  const scope = `FROM Log WHERE userId = ? AND undated = 0 AND listenedAt >= ? AND listenedAt < ?`;
  const args = [userId, from, to];

  const [totals] = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT COUNT(*) AS listens, COUNT(DISTINCT albumId) AS albums, COUNT(rating) AS rated,
            AVG(rating) AS avgRating, SUM(COALESCE(playCount, 1)) AS plays,
            SUM(CASE WHEN reviewText IS NOT NULL THEN 1 ELSE 0 END) AS reviews ${scope}`,
    ...args
  );
  const months = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT CAST(strftime('%m', listenedAt / 1000, 'unixepoch') AS INTEGER) AS m, COUNT(*) AS n
     ${scope} GROUP BY m`,
    ...args
  );
  const ratings = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT rating, COUNT(*) AS n ${scope} AND rating IS NOT NULL GROUP BY rating`,
    ...args
  );
  const [top] = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT albumId, COUNT(*) AS n ${scope} GROUP BY albumId ORDER BY n DESC LIMIT 1`,
    ...args
  );
  const [genres] = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT COUNT(DISTINCT ag.genreId) AS n FROM AlbumGenre ag
     WHERE ag.albumId IN (SELECT albumId ${scope})`,
    ...args
  );
  const days = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT DISTINCT strftime('%Y-%m-%d', listenedAt / 1000, 'unixepoch') AS d ${scope} ORDER BY d`,
    ...args
  );

  let streak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const { d } of days) {
    const t = Date.parse(String(d));
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    streak = Math.max(streak, run);
    prev = t;
  }

  const monthly = Array<number>(12).fill(0);
  for (const r of months) monthly[num(r.m) - 1] = num(r.n);

  return {
    totalListens: num(totals.listens),
    uniqueAlbums: num(totals.albums),
    ratedCount: num(totals.rated),
    avgRating: totals.avgRating == null ? null : Number(totals.avgRating),
    totalPlays: num(totals.plays),
    reviewsWritten: num(totals.reviews),
    monthly,
    ratingCounts: new Map(ratings.map((r) => [Number(r.rating), num(r.n)])),
    topAlbumListens: num(top?.n),
    genresExplored: num(genres.n),
    longestStreak: streak,
  };
}

function compare(stats: YearStatsData, manual: Awaited<ReturnType<typeof recount>>) {
  const checks: [string, unknown, unknown][] = [
    ["total listens", stats.totalListens, manual.totalListens],
    ["unique albums", stats.uniqueAlbums, manual.uniqueAlbums],
    ["total plays", stats.totalPlays, manual.totalPlays],
    ["reviews written", stats.reviewsWritten, manual.reviewsWritten],
    ["rated listens", stats.ratedCount, manual.ratedCount],
    ["avg rating", stats.avgRating?.toFixed(4) ?? null, manual.avgRating?.toFixed(4) ?? null],
    ["monthly counts", stats.monthly.join(","), manual.monthly.join(",")],
    [
      "busiest month",
      stats.busiestMonth?.listens ?? 0,
      Math.max(0, ...manual.monthly),
    ],
    [
      "rating distribution",
      stats.ratingDistribution.map((b) => b.count).join(","),
      stats.ratingDistribution.map((b) => manual.ratingCounts.get(b.rating) ?? 0).join(","),
    ],
    ["top album listens", stats.topAlbums[0]?.listens ?? 0, manual.topAlbumListens],
    ["genres explored", stats.genresExplored, manual.genresExplored],
    ["longest streak", stats.longestStreak?.days ?? 0, manual.longestStreak],
  ];
  return checks.map(([label, got, want]) => ({ label, got, want, ok: String(got) === String(want) }));
}

async function main() {
  const year = process.argv[2] ? Number(process.argv[2]) : 2025;
  let failures = 0;

  for (const username of USERS) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log(`${username}: not found`);
      failures += 1;
      continue;
    }
    const results = compare(await getYearStats(user.id, year), await recount(user.id, year));
    const bad = results.filter((r) => !r.ok);
    failures += bad.length;
    console.log(`\n${username} ${year}: ${results.length - bad.length}/${results.length} checks match`);
    for (const r of results) {
      console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.label.padEnd(20)} stored=${r.got}  recount=${r.want}`);
    }
  }

  console.log(failures ? `\n${failures} mismatches` : "\nAll year-in-review stats match the recount.");
  if (failures) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
