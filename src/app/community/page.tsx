import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFeedLogs,
  getFriendsListening,
  getTrendingAlbums,
  getSuggestedUsers,
} from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { ActivityItem } from "@/components/activity-item";
import { FollowButton } from "@/components/follow-button";

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followedIds = following.map((f) => f.followingId);
  const idsForFeed = [...followedIds, session.user.id];

  const [feed, friendsListening, trending, suggested] = await Promise.all([
    getFeedLogs(idsForFeed, session.user.id),
    getFriendsListening(followedIds),
    getTrendingAlbums(5),
    getSuggestedUsers(session.user.id, 5),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Sonic Feed</h1>
      <p className="mb-6 text-sm text-muted">
        Stay in sync with what your friends are logging and loving.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-lg font-medium">
              Recent activity from your circle
            </h2>
            {feed.length === 0 ? (
              <p className="text-sm text-muted">
                No activity yet.{" "}
                <Link href="/search" className="text-accent hover:underline">
                  Find people to follow
                </Link>{" "}
                or log an album to get started.
              </p>
            ) : (
              <div>
                {feed.map((log) => (
                  <ActivityItem key={log.id} log={log} isAuthenticated />
                ))}
              </div>
            )}
          </section>

          {friendsListening.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-medium">
                What your friends are listening to
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {friendsListening.map((log) => (
                  <AlbumCard
                    key={log.id}
                    album={log.album}
                    subtitle={`@${log.user.username}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {trending.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <TrendingUp size={15} className="text-accent" />
                Trending this month
              </h2>
              <ol className="flex flex-col gap-3">
                {trending.map((t, i) => (
                  <li key={t.album.id}>
                    <Link
                      href={`/album/${t.album.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <span className="w-4 text-xs font-medium text-accent">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-accent">
                          {t.album.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {t.album.artist.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {t.logCount} logs
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {suggested.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <UserPlus size={15} className="text-accent" />
                People to follow
              </h2>
              <div className="flex flex-col gap-3">
                {suggested.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/u/${u.username}`}
                      className="min-w-0 flex-1 text-sm"
                    >
                      <p className="truncate font-medium text-foreground">
                        {u.name || u.username}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {u._count.logs} logs
                      </p>
                    </Link>
                    <FollowButton username={u.username} initiallyFollowing={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
