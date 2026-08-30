import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFollowing } from "@/lib/queries";
import { UserListItem } from "@/components/user-list-item";

export default async function FollowingPage({
  params,
}: PageProps<"/u/[username]/following">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const following = await getFollowing(user.id);

  const followingIds = session?.user
    ? new Set(
        (
          await prisma.follow.findMany({
            where: {
              followerId: session.user.id,
              followingId: { in: following.map((f) => f.id) },
            },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {user.name || user.username} follows
      </h1>
      {following.length === 0 ? (
        <p className="text-sm text-muted">Not following anyone yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {following.map((followed) => (
            <UserListItem
              key={followed.id}
              user={followed}
              showFollowButton={Boolean(
                session?.user && session.user.id !== followed.id
              )}
              isFollowing={followingIds.has(followed.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
