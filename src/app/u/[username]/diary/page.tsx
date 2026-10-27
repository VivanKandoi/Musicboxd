import { notFound } from "next/navigation";
import { BookOpen, Lock, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDiary, getMonthlyJournalStats } from "@/lib/queries";
import { JournalEntryCard } from "@/components/journal-entry-card";
import { applyCustomCovers } from "@/lib/entitlements";
import { PaletteButton } from "@/components/command-palette";
import { ThemedSpotlightCard } from "@/components/fx";
import { EmptyState, buttonPrimary } from "@/components/ui/section";

const DIARY_LIMIT = 200;

export default async function DiaryPage({ params }: PageProps<"/u/[username]/diary">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const isOwnJournal = session?.user?.id === user.id;

  const isFollowing = session?.user
    ? Boolean(
        await prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: session.user.id, followingId: user.id },
          },
        })
      )
    : false;

  if (user.isPrivate && !isOwnJournal && !isFollowing) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-10 text-center">
        <Lock size={20} className="text-muted" />
        <p className="text-sm font-medium text-foreground">This journal is private</p>
        <p className="text-xs text-muted">
          Follow @{user.username} to see their journal.
        </p>
      </div>
    );
  }

  const [diary, monthlyStats] = await Promise.all([
    getUserDiary(user.id, session?.user?.id ?? null, DIARY_LIMIT),
    getMonthlyJournalStats(user.id),
  ]);
  await applyCustomCovers(session?.user?.id, diary, (log) => log.album);

  // Month sections, each a timeline of days.
  const months: { key: string; heading: string; days: { key: string; date: Date; logs: typeof diary }[] }[] = [];
  for (const log of diary) {
    const date = new Date(log.listenedAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    let month = months[months.length - 1];
    if (!month || month.key !== monthKey) {
      month = {
        key: monthKey,
        heading: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        days: [],
      };
      months.push(month);
    }
    const dayKey = date.toDateString();
    const day = month.days[month.days.length - 1];
    if (day && day.key === dayKey) day.logs.push(log);
    else month.days.push({ key: dayKey, date, logs: [log] });
  }
  const now = new Date();
  const today = now.toDateString();
  now.setDate(now.getDate() - 1);
  const yesterday = now.toDateString();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isOwnJournal ? "Your journal" : `${user.name || user.username}\u2019s journal`}
          </h1>
          <p className="text-sm text-muted">
            {diary.length > 0
              ? `${diary.length >= DIARY_LIMIT ? `${DIARY_LIMIT}+` : diary.length} ${diary.length === 1 ? "listen" : "listens"} across ${months.length} ${months.length === 1 ? "month" : "months"}`
              : `A diary of everything ${isOwnJournal ? "you've" : "they've"} listened to.`}
          </p>
        </div>
        {isOwnJournal && (
          <PaletteButton mode="log" className={buttonPrimary}>
            <Plus size={16} strokeWidth={2.5} />
            Log a listen
          </PaletteButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          {months.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={isOwnJournal ? "Your journal is waiting" : "Nothing logged yet"}
              action={
                isOwnJournal ? (
                  <PaletteButton mode="log" className={buttonPrimary}>
                    <Plus size={15} />
                    Log your first album
                  </PaletteButton>
                ) : undefined
              }
            >
              {isOwnJournal
                ? "Every album you log shows up here as a timeline, with your ratings and notes."
                : "When they log albums, they'll appear here."}
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-8">
              {months.map((month) => (
                <section key={month.key}>
                  <h2 className="sticky top-[57px] z-10 -mx-1 mb-3 flex items-baseline gap-2 bg-background/85 px-1 py-2 text-sm font-semibold text-foreground backdrop-blur">
                    {month.heading}
                    <span className="text-xs font-normal text-muted">
                      {month.days.reduce((n, d) => n + d.logs.length, 0)} logged
                    </span>
                  </h2>
                  <ol className="relative flex flex-col gap-4 border-l border-border pl-5 sm:pl-6">
                    {month.days.map((day) => (
                      <li key={day.key} className="relative">
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background sm:-left-[30px] ${
                            day.key === today ? "bg-accent" : "bg-muted/60"
                          }`}
                        />
                        <p className="mb-2 text-xs font-medium text-muted">
                          {day.key === today
                            ? "Today"
                            : day.key === yesterday
                              ? "Yesterday"
                              : day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <div className="flex flex-col gap-2">
                          {day.logs.map((log) => (
                            <JournalEntryCard key={log.id} log={log} isOwner={isOwnJournal} />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ThemedSpotlightCard className="rounded-2xl border border-border p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">This month</h2>
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <div>
                <dt className="text-xs text-muted">Albums logged</dt>
                <dd className="text-2xl font-semibold text-foreground">{monthlyStats.songsLoggedThisMonth}</dd>
                {monthlyStats.pctChangeVsLastMonth != null && (
                  <dd className={`text-xs ${monthlyStats.pctChangeVsLastMonth >= 0 ? "text-success" : "text-muted"}`}>
                    {monthlyStats.pctChangeVsLastMonth >= 0 ? "+" : ""}
                    {monthlyStats.pctChangeVsLastMonth}% vs last month
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-muted">Average rating</dt>
                <dd className="text-2xl font-semibold text-foreground">
                  {monthlyStats.avgRating ? monthlyStats.avgRating.toFixed(1) : "\u2014"}
                  <span className="text-sm font-normal text-muted"> / 5</span>
                </dd>
              </div>
              {monthlyStats.topGenre && (
                <div>
                  <dt className="text-xs text-muted">Top genre</dt>
                  <dd className="text-sm font-semibold text-foreground">{monthlyStats.topGenre}</dd>
                </div>
              )}
            </dl>
          </ThemedSpotlightCard>
        </aside>
      </div>
    </div>
  );
}
