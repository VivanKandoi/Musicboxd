import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastfmConfigured } from "@/lib/lastfm";
import { failStaleJobs } from "@/lib/lastfm-import";
import type { MatchCandidate } from "@/lib/import-matching";
import { LastfmImportPanel } from "@/components/lastfm-import-panel";
import { ImportReviewQueue } from "@/components/import-review-queue";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings/import");

  await failStaleJobs(session.user.id);
  const [latestJob, reviewItems, importedCount] = await Promise.all([
    prisma.importJob.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.importReviewItem.findMany({
      where: { userId: session.user.id, status: "pending" },
      orderBy: { playCount: "desc" },
    }),
    prisma.log.count({ where: { userId: session.user.id, source: "lastfm" } }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link href="/settings" className="text-xs text-muted hover:text-foreground">
          ← Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Import listening history</h1>
        <p className="mt-1 text-sm text-muted">
          Bring in your last year of Last.fm scrobbles plus your all-time top albums. Imported
          listens are unrated and private to your diary and stats; they never show up in your
          friends&rsquo; feeds.
        </p>
      </div>

      <LastfmImportPanel
        configured={lastfmConfigured()}
        importedCount={importedCount}
        initialJob={latestJob ? JSON.parse(JSON.stringify(latestJob)) : null}
      />

      <ImportReviewQueue
        initialItems={reviewItems.map((item) => ({
          id: item.id,
          artistName: item.artistName,
          albumTitle: item.albumTitle,
          playCount: item.playCount,
          candidates: item.candidates as unknown as MatchCandidate[],
        }))}
      />
    </div>
  );
}
