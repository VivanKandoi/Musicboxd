import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfileContent } from "@/lib/profile-access";
import { getYearStats, getYearsWithListens } from "@/lib/year-in-review";
import { getCoverOverrides } from "@/lib/entitlements";
import { ShareYearButton } from "@/components/share-year-button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseYear(raw: string) {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1950 && year <= 2100 ? year : null;
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]/year/[year]">): Promise<Metadata> {
  const { username, year } = await params;
  const card = `/api/year-in-review/${encodeURIComponent(username)}/${year}/card`;
  return {
    title: `@${username}'s ${year} in music — MusicBoxd`,
    openGraph: { images: [{ url: card, width: 1080, height: 1350 }] },
    twitter: { card: "summary_large_image", images: [card] },
  };
}

export default async function YearInReviewPage({ params }: PageProps<"/u/[username]/year/[year]">) {
  const { username, year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (!year) notFound();

  const session = await auth();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  if (!(await canViewProfileContent(session?.user?.id, user))) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-10 text-center">
        <Lock size={20} className="text-muted" />
        <p className="text-sm font-medium text-foreground">This year in review is private</p>
        <p className="text-xs text-muted">Follow @{user.username} to see it.</p>
      </div>
    );
  }

  const [stats, years] = await Promise.all([getYearStats(user.id, year), getYearsWithListens(user.id)]);
  const covers = await getCoverOverrides(session?.user?.id, stats.topAlbums.map((a) => a.albumId));
  stats.topAlbums = stats.topAlbums.map((a) => ({ ...a, coverUrl: covers.get(a.albumId) ?? a.coverUrl }));
  const isOwn = session?.user?.id === user.id;
  const displayName = user.name || user.username;

  const yearSwitcher = years.length > 1 && (
    <div className="flex flex-wrap gap-2">
      {years.map((y) => (
        <Link
          key={y}
          href={`/u/${user.username}/year/${y}`}
          className={
            y === year
              ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
              : "rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground"
          }
        >
          {y}
        </Link>
      ))}
    </div>
  );

  if (stats.totalListens === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{displayName}&rsquo;s {year} in music</h1>
        <p className="text-sm text-muted">
          No listens logged in {year}{isOwn ? " yet — log some albums and check back" : ""}.
        </p>
        {yearSwitcher}
      </div>
    );
  }

  const maxMonth = Math.max(...stats.monthly, 1);
  const maxRating = Math.max(...stats.ratingDistribution.map((b) => b.count), 1);
  const [topAlbum, ...restAlbums] = stats.topAlbums;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Year in review</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {displayName}&rsquo;s {year} in music
          </h1>
        </div>
        <ShareYearButton username={user.username} year={year} />
      </div>
      {yearSwitcher}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat value={stats.totalListens} label="listens logged" />
        <BigStat value={stats.uniqueAlbums} label="different albums" />
        <BigStat value={stats.uniqueArtists} label="artists" />
        <BigStat value={stats.genresExplored} label="genres explored" />
      </section>

      {topAlbum && (
        <section className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <h2 className="mb-4 text-sm font-medium text-muted">Your album of the year</h2>
          <div className="flex flex-col gap-5 sm:flex-row">
            <Link href={`/album/${topAlbum.albumId}`} className="shrink-0">
              <div className="relative aspect-square w-40 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border">
                {topAlbum.coverUrl && (
                  <Image src={topAlbum.coverUrl} alt={topAlbum.title} fill sizes="160px" className="object-cover" />
                )}
              </div>
            </Link>
            <div className="flex flex-col justify-center gap-1">
              <Link href={`/album/${topAlbum.albumId}`} className="text-2xl font-semibold hover:text-accent">
                {topAlbum.title}
              </Link>
              <p className="text-muted">{topAlbum.artist}</p>
              <p className="mt-2 text-sm text-foreground/90">
                Logged {topAlbum.listens} {topAlbum.listens === 1 ? "time" : "times"}
                {topAlbum.avgRating != null && ` · rated ${topAlbum.avgRating.toFixed(1)}★ on average`}
              </p>
            </div>
          </div>
          {restAlbums.length > 0 && (
            <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" start={2}>
              {restAlbums.map((a, i) => (
                <li key={a.albumId}>
                  <Link href={`/album/${a.albumId}`} className="group block">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border group-hover:ring-accent">
                      {a.coverUrl && <Image src={a.coverUrl} alt={a.title} fill sizes="140px" className="object-cover" />}
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground">
                      <span className="text-muted">{i + 2}.</span> {a.title}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {a.artist} · {a.listens}×
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Top artists</h2>
          <ol className="flex flex-col gap-2">
            {stats.topArtists.map((a, i) => (
              <li key={a.name} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="mr-2 text-muted">{i + 1}</span>
                  {a.name}
                </span>
                <span className="shrink-0 text-xs text-muted">{a.listens} listens</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Top genres</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topGenres.map((g) => (
              <span key={g.name} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground">
                {g.name} <span className="text-muted">· {g.albums} {g.albums === 1 ? "album" : "albums"}</span>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Your listening rhythm</h2>
          <p className="text-xs text-muted">
            {stats.busiestMonth && (
              <>
                Busiest month: <span className="text-foreground">{MONTH_NAMES[stats.busiestMonth.month]}</span> (
                {stats.busiestMonth.listens})
              </>
            )}
          </p>
        </div>
        <div className="flex h-32 items-end gap-1.5">
          {stats.monthly.map((n, i) => (
            <div key={MONTHS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-muted">{n || ""}</span>
              <div
                className={`w-full rounded-t ${stats.busiestMonth?.month === i ? "bg-accent" : "bg-accent/40"}`}
                style={{ height: `${(n / maxMonth) * 100}%`, minHeight: n ? 2 : 0 }}
              />
              <span className="text-[10px] text-muted">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
        {stats.longestStreak && (
          <p className="mt-4 text-sm text-foreground/90">
            Longest streak: <span className="font-semibold text-accent">{stats.longestStreak.days} days</span>{" "}
            in a row
            {stats.longestStreak.days > 1 &&
              ` (${formatDay(stats.longestStreak.start)} – ${formatDay(stats.longestStreak.end)})`}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 text-sm font-medium text-foreground">How you rated</h2>
          <p className="mb-3 text-xs text-muted">
            {stats.ratedCount} rated listens
            {stats.avgRating != null && ` · ${stats.avgRating.toFixed(2)}★ average`} · {stats.reviewsWritten}{" "}
            {stats.reviewsWritten === 1 ? "review" : "reviews"} written
          </p>
          <div className="flex h-24 items-end gap-1">
            {stats.ratingDistribution.map((b) => (
              <div key={b.rating} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-star"
                  style={{ height: `${(b.count / maxRating) * 100}%`, minHeight: b.count ? 2 : 0 }}
                  title={`${b.rating}★: ${b.count}`}
                />
                <span className="text-[9px] text-muted">{b.rating % 1 === 0 ? `${b.rating}★` : ""}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Where the music fit in</h2>
          {stats.topContexts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.topContexts.map((c) => (
                <span key={c.name} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                  #{c.name} · {c.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              Add listening-context tags (like &ldquo;commute&rdquo; or &ldquo;late night&rdquo;) to your logs and
              they&rsquo;ll show up here.
            </p>
          )}
          {stats.firstListen && (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              First listen of {year}:{" "}
              <Link href={`/album/${stats.firstListen.albumId}`} className="text-foreground hover:text-accent">
                {stats.firstListen.title}
              </Link>{" "}
              by {stats.firstListen.artist} on {formatDay(stats.firstListen.date)}
            </p>
          )}
          {stats.importedListens > 0 && (
            <p className="mt-2 text-xs text-muted">
              Includes {stats.importedListens} listens imported from Last.fm.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function BigStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-3xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
