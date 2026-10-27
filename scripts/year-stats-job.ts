// Precomputes year-in-review stats for every user. Run nightly (e.g. cron):
//   npm run jobs:year-stats            -> every year each user has listens in
//   npm run jobs:year-stats -- 2025    -> just 2025
import { prisma } from "../src/lib/prisma";
import { getYearsWithListens, refreshYearStats } from "../src/lib/year-in-review";

async function main() {
  const onlyYear = process.argv[2] ? Number(process.argv[2]) : null;
  if (onlyYear !== null && !Number.isInteger(onlyYear)) {
    throw new Error(`Not a year: ${process.argv[2]}`);
  }

  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  let rows = 0;
  for (const user of users) {
    const years = onlyYear ? [onlyYear] : await getYearsWithListens(user.id);
    for (const year of years) {
      const stats = await refreshYearStats(user.id, year);
      rows += 1;
      console.log(`${user.username} ${year}: ${stats.totalListens} listens, ${stats.uniqueAlbums} albums`);
    }
  }
  console.log(`Done: ${rows} year_stats rows for ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
