import { prisma } from "@/lib/prisma";

export async function canViewProfileContent(
  viewerId: string | null | undefined,
  owner: { id: string; isPrivate: boolean }
) {
  if (!owner.isPrivate || viewerId === owner.id) return true;
  if (!viewerId) return false;
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: owner.id } },
  });
  return Boolean(follow);
}
