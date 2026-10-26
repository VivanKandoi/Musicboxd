// Runs Last.fm import jobs outside the web server. Use this in deployments where request
// handlers can't run for minutes (serverless): set IMPORT_WORKER=external on the web app
// so it only queues jobs, and keep this process running (or call it from cron with --once).
//   npm run jobs:import-worker
//   npm run jobs:import-worker -- --once
import { prisma } from "../src/lib/prisma";
import { runLastfmImport } from "../src/lib/lastfm-import";

const POLL_MS = 5000;

// Claims the oldest pending job; the conditional update keeps two workers from taking the same one.
async function claimNextJob() {
  const next = await prisma.importJob.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!next) return null;
  const claimed = await prisma.importJob.updateMany({
    where: { id: next.id, status: "pending" },
    data: { status: "running", stage: "Starting" },
  });
  return claimed.count === 1 ? next.id : null;
}

async function main() {
  const once = process.argv.includes("--once");
  let stopping = false;
  process.on("SIGINT", () => (stopping = true));
  process.on("SIGTERM", () => (stopping = true));

  console.log(`Import worker started${once ? " (single pass)" : ""}`);
  while (!stopping) {
    const jobId = await claimNextJob();
    if (jobId) {
      console.log(`Running import ${jobId}`);
      await runLastfmImport(jobId);
      const job = await prisma.importJob.findUnique({ where: { id: jobId } });
      console.log(`Import ${jobId}: ${job?.status}${job?.error ? ` (${job.error})` : ""}`);
      continue;
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
