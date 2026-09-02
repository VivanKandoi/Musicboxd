import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDiary, getMonthlyJournalStats } from "@/lib/queries";
import { StarRating } from "@/components/star-rating";

function formatGroupHeading(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);

  const formatted = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (diffDays === 0) return `Today, ${formatted}`;
  if (diffDays === 1) return `Yesterday, ${formatted}`;
  return formatted;
}

export default async function DiaryPage({ params }: PageProps<"/u/[username]/diary">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const isOwnJournal = session?.user?.id === user.id;

  const [diary, monthlyStats] = await Promise.all([
    getUserDiary(user.id, session?.user?.id ?? null, 200),
    getMonthlyJournalStats(user.id),
  ]);

  const groups: { heading: string; logs: typeof diary }[] = [];
  for (const log of diary) {
    const heading = formatGroupHeading(new Date(log.listenedAt));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.heading === heading) {
      lastGroup.logs.push(log);
    } else {
      groups.push({ heading, logs: [log] });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {isOwnJournal ? "Your Personal Journal" : `${user.name || user.username}’s Journal`}
      </h1>
      <p className="mb-6 text-sm text-muted">
        A reflective visual space tracking {isOwnJournal ? "your" : "their"} sonic life.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          {groups.length === 0 ? (
            <p className="text-sm text-muted">No logs yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.heading}>
                  <h2 className="mb-2 text-sm font-medium text-muted">{group.heading}</h2>
                  <div className="flex flex-col gap-2">
                    {group.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
                      >
                        <Link href={`/album/${log.album.id}`} className="shrink-0">
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                            {log.album.coverUrl && (
                              <Image
                                src={log.album.coverUrl}
                                alt={log.album.title}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            )}
                          </div>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={`/album/${log.album.id}`}
                                className="truncate text-sm font-medium text-foreground hover:text-accent"
                              >
                                {log.album.title}
                              </Link>
                              <p className="truncate text-xs text-muted">
                                {log.album.artist.name}
                              </p>
                            </div>
                            {log.rating != null && (
                              <div className="flex shrink-0 items-center gap-1">
                                <StarRating value={log.rating} readOnly size="sm" />
                              </div>
                            )}
                          </div>
                          {log.reviewText && (
                            <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
                              &ldquo;{log.reviewText}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">
              Monthly Statistics
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-muted">Songs Logged This Month</p>
                <p className="text-xl font-semibold text-foreground">
                  {monthlyStats.songsLoggedThisMonth}
                </p>
                {monthlyStats.pctChangeVsLastMonth != null && (
                  <p className="text-xs text-success">
                    {monthlyStats.pctChangeVsLastMonth >= 0 ? "+" : ""}
                    {monthlyStats.pctChangeVsLastMonth}% vs last month
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted">Average Rating</p>
                <p className="text-xl font-semibold text-foreground">
                  {monthlyStats.avgRating ? monthlyStats.avgRating.toFixed(1) : "—"}
                  <span className="text-sm text-muted"> / 5</span>
                </p>
              </div>
              {monthlyStats.topGenre && (
                <div>
                  <p className="text-xs text-muted">Top Genre</p>
                  <p className="text-sm font-semibold text-foreground">
                    {monthlyStats.topGenre}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
