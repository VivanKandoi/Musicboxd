import Link from "next/link";
import { Sparkles, Search as SearchIcon, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDiary, getFeedLogs, getRecentAlbums } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { DEMO_RECOMMENDATIONS } from "@/lib/demo-discover-data";

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

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    const recentAlbums = await getRecentAlbums(12);
    return (
      <div>
        <section className="flex flex-col items-start gap-4 py-10 sm:py-16">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Log every listen.
            <br />
            <span className="text-accent">Build your taste.</span>
          </h1>
          <p className="max-w-xl text-muted">
            MusicBoxd is a social home for music lovers — rate albums, write
            reviews, keep a listening diary, and see what your friends are
            playing.
          </p>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-accent"
            >
              Log in
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Recently added to the catalog</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followedIds = following.map((f) => f.followingId);

  const [recentlyLogged, communityPicks] = await Promise.all([
    getUserDiary(session.user.id, session.user.id, 6),
    getFeedLogs(followedIds, session.user.id),
  ]);
  const communityPreview = communityPicks.slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {greeting()}, {session.user.name || session.user.username}
          </h1>
          <p className="text-sm text-muted">
            Your sonic world is looking vibrant today.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/discover"
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Sparkles size={15} />
            Discover Music
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
          >
            <SearchIcon size={15} />
            Log an Album
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recently Logged</h2>
        {recentlyLogged.length === 0 ? (
          <p className="text-sm text-muted">
            You haven&rsquo;t logged anything yet.{" "}
            <Link href="/search" className="text-accent hover:underline">
              Find an album to log
            </Link>
            .
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentlyLogged.map((log) => (
              <AlbumCard
                key={log.id}
                album={log.album}
                subtitle={`Logged ${timeAgo(new Date(log.listenedAt))}`}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-lg font-medium">AI-Curated Recommendations</h2>
          <div className="flex flex-col gap-3">
            {DEMO_RECOMMENDATIONS.map((rec) => (
              <div
                key={rec.title}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3"
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(135deg, ${rec.gradient})` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {rec.title}
                  </p>
                  <p className="truncate text-xs text-muted">{rec.artist}</p>
                  <p className="truncate text-xs text-muted">{rec.reason}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                  {rec.match}% Match
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="mb-3 text-lg font-medium">Community Picks</h2>
            {communityPreview.length === 0 ? (
              <p className="text-sm text-muted">
                Follow other listeners to see their activity here.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {communityPreview.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border bg-surface p-3 text-sm"
                  >
                    <Link
                      href={`/u/${log.user.username}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {log.user.name || log.user.username}
                    </Link>{" "}
                    <span className="text-muted">
                      {log.isRelisten ? "relistened to" : "logged"}
                    </span>{" "}
                    <Link
                      href={`/album/${log.album.id}`}
                      className="text-foreground hover:text-accent"
                    >
                      &lsquo;{log.album.title}&rsquo;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/discover"
            className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/5 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles size={15} className="text-accent" />
              Semantic Search
            </div>
            <p className="text-xs text-muted">
              Find music that matches how you feel. Describe your mood,
              scenery, or weather in plain natural language and let our AI
              curate the perfect soundtrack.
            </p>
            <span className="flex items-center gap-1 text-xs font-medium text-accent">
              Try Semantic Discovery
              <ArrowRight size={13} />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
