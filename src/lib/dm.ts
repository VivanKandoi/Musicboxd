import { prisma } from "@/lib/prisma";

export async function canMessage(senderId: string, recipientId: string) {
  if (senderId === recipientId) return false;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { dmPrivacy: true },
  });
  if (!recipient) return false;
  if (recipient.dmPrivacy === "none") return false;
  if (recipient.dmPrivacy === "everyone") return true;

  const isFollower = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: senderId, followingId: recipientId } },
  });
  return Boolean(isFollower);
}
