import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFollowers } from "@/lib/queries";
import { UserListItem } from "@/components/user-list-item";

export default async function FollowersPage({
  params,
}: PageProps<"/u/[username]/followers">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const followers = await getFollowers(user.id);

  const followingIds = session?.user
    ? new Set(
        (
          await prisma.follow.findMany({
            where: {
              followerId: session.user.id,
              followingId: { in: followers.map((f) => f.id) },
            },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {user.name || user.username}&rsquo;s followers
      </h1>
      {followers.length === 0 ? (
        <p className="text-sm text-muted">No followers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {followers.map((follower) => (
            <UserListItem
              key={follower.id}
              user={follower}
              showFollowButton={Boolean(
                session?.user && session.user.id !== follower.id
              )}
              isFollowing={followingIds.has(follower.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
