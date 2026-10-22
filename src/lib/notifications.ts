import { prisma } from "@/lib/prisma";

type NotificationType = "follow" | "like" | "comment" | "message";

const prefByType: Record<NotificationType, "notifyOnFollow" | "notifyOnLike" | "notifyOnComment" | "notifyOnMessage"> = {
  follow: "notifyOnFollow",
  like: "notifyOnLike",
  comment: "notifyOnComment",
  message: "notifyOnMessage",
};

export async function createNotification({
  userId,
  actorId,
  type,
  logId,
}: {
  userId: string;
  actorId: string;
  type: NotificationType;
  logId?: string;
}) {
  if (userId === actorId) return null;

  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: { [prefByType[type]]: true },
  });
  if (!recipient || !recipient[prefByType[type]]) return null;

  return prisma.notification.create({
    data: { userId, actorId, type, logId },
  });
}
