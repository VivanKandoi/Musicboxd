import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Flame,
  CalendarDays,
  Compass,
  Disc3,
  Users,
  PartyPopper,
  ListMusic,
  Star,
  BookOpen,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDiary, getFeedLogs, getRecentAlbums } from "@/lib/queries";
import { getRecommendations } from "@/lib/recommendations";
import { getOnThisDay } from "@/lib/on-this-day";
import { applyCustomCovers } from "@/lib/entitlements";
import { AlbumCard } from "@/components/album-card";
import { RecommendationCard } from "@/components/recommendation-card";
import { OnThisDay } from "@/components/on-this-day";
import { StarRating } from "@/components/star-rating";
import { AccentAurora, ThemedSpotlightCard } from "@/components/fx";
import { PaletteButton } from "@/components/command-palette";
import { SectionHeader, EmptyState, buttonPrimary, buttonSecondary } from "@/components/ui/section";
import { Shelf } from "@/components/ui/shelf";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return "just now";
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Listening stats for the home hero: logs this week and month, and the current daily streak
// (today counts if you've logged; otherwise the streak runs up to yesterday).
async function getHomeStats(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const since = new Date(now.getTime() - 120 * 86400000);
  const [week, month, recent] = await Promise.all([
    prisma.log.count({ where: { userId, source: "manual", listenedAt: { gte: weekAgo } } }),
    prisma.log.count({ where: { userId, source: "manual", listenedAt: { gte: monthStart } } }),
    prisma.log.findMany({
      where: { userId, source: "manual", listenedAt: { gte: since } },
      select: { listenedAt: true },
    }),
  ]);
  const days = new Set(recent.map((l) => dayKey(l.listenedAt)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { week, month, streak, loggedToday: days.has(dayKey(now)) };
}

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) return <Landing />;

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followedIds = following.map((f) => f.followingId);

  const [recentlyLogged, communityPicks, recommendations, onThisDay, stats] = await Promise.all([
    getUserDiary(session.user.id, session.user.id, 12),
    getFeedLogs(followedIds, session.user.id),
    getRecommendations(session.user.id),
    getOnThisDay(session.user.id),
    getHomeStats(session.user.id),
  ]);
  const communityPreview = communityPicks.slice(0, 4);
  await Promise.all([
    applyCustomCovers(session.user.id, recentlyLogged, (log) => log.album),
    applyCustomCovers(session.user.id, onThisDay, (log) => log.album),
    applyCustomCovers(session.user.id, recommendations, (rec) => rec),
    applyCustomCovers(session.user.id, communityPreview, (log) => log.album),
  ]);
  const username = session.user.username;
  const name = session.user.name || username;

  const nudge =
    stats.week === 0
      ? "Nothing logged this week yet. What have you been listening to?"
      : stats.loggedToday
        ? `${stats.week} ${stats.week === 1 ? "listen" : "listens"} logged this week. Nice rhythm.`
        : stats.streak > 0
          ? `Log something today to keep your ${stats.streak}-day streak alive.`
          : `${stats.week} ${stats.week === 1 ? "listen" : "listens"} logged this week.`;

  return (
    <div className="flex flex-col gap-10">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-surface/60 p-6 sm:p-8">
        <AccentAurora opacity={0.45} className="absolute inset-x-0 top-0 -z-10 h-56" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <BlurText
              as="h1"
              text={`${greeting()}, ${name}`}
              delay={60}
              animateBy="words"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            />
            <p className="mt-2 text-sm text-muted">{nudge}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PaletteButton mode="log" className={buttonPrimary}>
                <Plus size={16} strokeWidth={2.5} />
                Log a listen
              </PaletteButton>
              <Link href="/discover" className={buttonSecondary}>
                <Sparkles size={15} className="text-accent" />
                Find music by mood
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <HeroStat label="This week" value={stats.week} />
            <HeroStat label="This month" value={stats.month} />
            <HeroStat
              label="Day streak"
              value={stats.streak}
              icon={<Flame size={14} className={stats.streak > 0 ? "text-accent" : "text-muted"} />}
            />
          </dl>
        </div>
      </section>

      {onThisDay.length > 0 && <OnThisDay logs={onThisDay} />}

      <section>
        <SectionHeader
          title="Recently logged"
          subtitle="Your latest listens"
          href={`/u/${username}/diary`}
          linkLabel="Open journal"
        />
        {recentlyLogged.length === 0 ? (
          <EmptyState
            icon={Disc3}
            title="Your journal is empty"
            action={
              <PaletteButton mode="log" className={buttonPrimary}>
                <Plus size={15} />
                Log your first album
              </PaletteButton>
            }
          >
            Log what you listen to, rate it, and add a few words. It all builds into your profile and your year in
            review.
          </EmptyState>
        ) : (
          <Shelf label="Recently logged">
            {recentlyLogged.map((log) => (
              <AlbumCard key={log.id} album={log.album} subtitle={`Logged ${timeAgo(new Date(log.listenedAt))}`} />
            ))}
          </Shelf>
        )}
      </section>

      {recommendations.length > 0 && (
        <section>
          <SectionHeader title="Picked for you" subtitle="Based on the albums you rate highly" icon={Sparkles} />
          <Shelf label="Recommendations">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </Shelf>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionHeader title="From people you follow" href="/community" linkLabel="Community" />
          {communityPreview.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Your feed is quiet"
              action={
                <Link href="/community" className={buttonSecondary}>
                  Find people to follow
                </Link>
              }
              compact
            >
              Follow other listeners to see what they&rsquo;re logging and reviewing.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {communityPreview.map((log) => (
                <Link
                  key={log.id}
                  href={`/album/${log.album.id}`}
                  className="group flex gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-accent/60"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                    {log.album.coverUrl && (
                      <Image src={log.album.coverUrl} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[9px] font-medium uppercase text-accent ring-1 ring-border">
                        {log.user.avatarUrl ? (
                          <Image src={log.user.avatarUrl} alt="" fill sizes="20px" className="object-cover" />
                        ) : (
                          log.user.username.slice(0, 2)
                        )}
                      </span>
                      <span className="truncate">
                        <span className="font-medium text-foreground">{log.user.name || log.user.username}</span>{" "}
                        {log.isRelisten ? "relistened" : "logged"} · {timeAgo(new Date(log.createdAt))}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground group-hover:text-accent">
                      {log.album.title}
                    </p>
                    <p className="truncate text-xs text-muted">{log.album.artist.name}</p>
                    {log.rating != null && (
                      <div className="mt-0.5">
                        <StarRating value={log.rating} readOnly size="sm" />
                      </div>
                    )}
                    {log.reviewText && (
                      <p className="mt-1 line-clamp-2 text-xs italic text-foreground/80">&ldquo;{log.reviewText}&rdquo;</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <ThemedSpotlightCard className="rounded-2xl border border-accent/40 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles size={16} className="text-accent" />
              Semantic Discovery
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Describe a mood, a place or a story in plain words and get songs that are actually about it.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["rainy night drive", "falling in love", "starting over"].map((q) => (
                <Link
                  key={q}
                  href={`/discover?${new URLSearchParams({ q })}`}
                  className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-foreground"
                >
                  {q}
                </Link>
              ))}
            </div>
            <Link href="/discover" className="mt-4 flex items-center gap-1 text-xs font-medium text-accent">
              Open Discover <ArrowRight size={13} />
            </Link>
          </ThemedSpotlightCard>

          {[
            { href: "/guides", icon: Compass, title: "Genre guides", text: "Curated starting points for golden-age hip hop, 90s grunge, neo-soul and more." },
            { href: "/releases", icon: CalendarDays, title: "Release calendar", text: "New and upcoming albums from artists you follow." },
            { href: `/u/${username}/year`, icon: PartyPopper, title: "Your year in music", text: "Top albums, artists, streaks and your listening rhythm." },
          ].map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} className="group block">
              <ThemedSpotlightCard className="flex items-start gap-3 rounded-2xl border border-border p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                    {title}
                    <ArrowRight size={13} className="text-muted transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{text}</span>
                </span>
              </ThemedSpotlightCard>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="min-w-24 rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur">
      <dd className="flex items-center gap-1.5 text-2xl font-semibold text-foreground">
        <CountUp to={value} duration={1} trigger="load" />
        {icon}
      </dd>
      <dt className="text-[11px] text-muted">{label}</dt>
    </div>
  );
}

async function Landing() {
  const recentAlbums = await getRecentAlbums(18);
  const mosaic = recentAlbums.filter((a) => a.coverUrl).slice(0, 9);

  const features = [
    { icon: BookOpen, title: "Keep a listening journal", text: "Log every album you hear with a rating, a review and where you were." },
    { icon: Sparkles, title: "Discover by feeling", text: "Describe a mood or a story and get songs whose lyrics are actually about it." },
    { icon: PartyPopper, title: "Your year in music", text: "Top albums, artists, streaks and your rhythm, ready to share." },
    { icon: ListMusic, title: "Lists with friends", text: "Build ranked or themed lists together and send albums in DMs." },
  ];

  return (
    <div className="flex flex-col gap-16">
      <section className="relative isolate grid items-center gap-10 pt-6 sm:pt-12 lg:grid-cols-[1.1fr_1fr]">
        <AccentAurora className="absolute -inset-x-4 -top-12 -z-10 h-96 sm:-inset-x-6" />
        <div className="flex flex-col items-start gap-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Star size={12} className="fill-current" />
            Your social music journal
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            <BlurText as="span" text="Log every listen." delay={80} animateBy="words" />
            <BlurText as="span" text="Build your taste." delay={80} animateBy="words" className="text-accent" />
          </h1>
          <p className="max-w-lg text-base text-muted">
            Rate albums, write reviews, keep a listening diary, and see what your friends are playing. Then let
            MusicBoxd show you what to hear next.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={`${buttonPrimary} px-5 py-2.5`}>
              Get started, it&rsquo;s free
              <ArrowRight size={15} />
            </Link>
            <Link href="/discover" className={`${buttonSecondary} px-5 py-2.5`}>
              <Sparkles size={15} className="text-accent" />
              Try Discover
            </Link>
          </div>
        </div>

        {mosaic.length >= 6 && (
          <div className="relative mx-auto w-full max-w-md [perspective:1400px]" aria-hidden="true">
            <div className="grid grid-cols-3 gap-3 [transform:rotateY(-14deg)_rotateX(8deg)] [transform-style:preserve-3d]">
              {mosaic.map((album, i) => (
                <div
                  key={album.id}
                  className={`relative aspect-square overflow-hidden rounded-xl shadow-xl shadow-black/40 ring-1 ring-white/10 ${
                    i % 3 === 1 ? "translate-y-6" : ""
                  }`}
                >
                  <Image src={album.coverUrl!} alt="" fill sizes="160px" className="object-cover" priority={i < 3} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <ThemedSpotlightCard key={title} className="rounded-2xl border border-border p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon size={19} />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted">{text}</p>
          </ThemedSpotlightCard>
        ))}
      </section>

      <section>
        <SectionHeader title="Recently added to the catalog" />
        <Shelf label="Recently added albums">
          {recentAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </Shelf>
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-surface p-8 text-center sm:p-12">
        <AccentAurora opacity={0.35} className="absolute inset-x-0 top-0 -z-10 h-48" />
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What did you listen to today?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Start your journal in under a minute. Your first log is the start of your year in music.
        </p>
        <Link href="/signup" className={`${buttonPrimary} mt-6 px-5 py-2.5`}>
          Create your account
          <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
