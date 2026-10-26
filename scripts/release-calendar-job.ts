// Nightly release-calendar job: syncs new/upcoming releases for followed artists from
// MusicBrainz, then sends release-day, anniversary and reissue notifications.
//   npm run jobs:releases
//   npm run jobs:releases -- 2026-11-07   -> run as if it were that date (for testing)
import { prisma } from "../src/lib/prisma";
import { runReleaseCalendarJob } from "../src/lib/release-calendar";

async function main() {
  const arg = process.argv[2];
  const now = arg ? new Date(`${arg}T12:00:00Z`) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Not a date: ${arg}`);
  const result = await runReleaseCalendarJob({ now });
  console.log(result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
