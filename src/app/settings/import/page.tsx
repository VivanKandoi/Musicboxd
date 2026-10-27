import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { applyCustomCovers } from "@/lib/entitlements";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastfmConfigured } from "@/lib/lastfm";
import { failStaleJobs, getImportedAlbums } from "@/lib/lastfm-import";
import type { MatchCandidate } from "@/lib/import-matching";
import { LastfmImportPanel } from "@/components/lastfm-import-panel";
import { ImportReviewQueue } from "@/components/import-review-queue";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings/import");

  await failStaleJobs(session.user.id);
  const [latestJob, reviewItems, importedCount, imported] = await Promise.all([
    prisma.importJob.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.importReviewItem.findMany({
      where: { userId: session.user.id, status: "pending" },
      orderBy: { playCount: "desc" },
    }),
    prisma.log.count({ where: { userId: session.user.id, source: "lastfm" } }),
    getImportedAlbums(session.user.id),
  ]);
  await applyCustomCovers(session.user.id, imported, (row) => row.album);

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

      {imported.length > 0 && (
        <section id="imported">
          <h2 className="text-lg font-medium">Imported from Last.fm ({imported.length})</h2>
          <p className="mb-3 text-sm text-muted">
            Albums from your Last.fm history that matched the catalogue, most-played first. Only you can see
            this list. Plays without a date (from your all-time top albums) count towards your stats and
            recommendations but don&rsquo;t appear in your journal.
          </p>
          <ul className="flex flex-col gap-2">
            {imported.map(({ album, plays, lastPlayed }) => (
              <li key={album.id}>
                <Link
                  href={`/album/${album.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                    {album.coverUrl && (
                      <Image src={album.coverUrl} alt={album.title} fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{album.title}</p>
                    <p className="truncate text-xs text-muted">{album.artist.name}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted">
                    <p className="font-medium text-foreground">
                      {plays.toLocaleString()} {plays === 1 ? "play" : "plays"}
                    </p>
                    <p>
                      {lastPlayed
                        ? `Last played ${lastPlayed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
                        : "All-time plays"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
