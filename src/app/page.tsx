import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedLogs, getFriendsListening, getRecentAlbums } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { ActivityItem } from "@/components/activity-item";

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
            First Log is a social home for music lovers — rate albums, write
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
  const idsForFeed = [...followedIds, session.user.id];

  const [feed, friendsListening] = await Promise.all([
    getFeedLogs(idsForFeed, session.user.id),
    getFriendsListening(followedIds),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-medium">What your friends are listening to</h2>
        {friendsListening.length === 0 ? (
          <p className="text-sm text-muted">
            Follow other listeners to see their recent spins here.{" "}
            <Link href="/search" className="text-accent hover:underline">
              Find albums to log
            </Link>
            .
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {friendsListening.map((log) => (
              <AlbumCard
                key={log.id}
                album={log.album}
                subtitle={`@${log.user.username}`}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Activity feed</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted">
            No activity yet. Log an album to get started.
          </p>
        ) : (
          <div>
            {feed.map((log) => (
              <ActivityItem key={log.id} log={log} isAuthenticated />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
