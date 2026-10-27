import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "message"
  | "release"
  | "anniversary"
  | "reissue";

type PrefField =
  | "notifyOnFollow"
  | "notifyOnLike"
  | "notifyOnComment"
  | "notifyOnMessage"
  | "notifyOnRelease"
  | "notifyOnAnniversary";

const prefByType: Record<NotificationType, PrefField> = {
  follow: "notifyOnFollow",
  like: "notifyOnLike",
  comment: "notifyOnComment",
  message: "notifyOnMessage",
  release: "notifyOnRelease",
  anniversary: "notifyOnAnniversary",
  reissue: "notifyOnAnniversary",
};

export async function createNotification({
  userId,
  actorId,
  type,
  logId,
  albumId,
  dedupeKey,
}: {
  userId: string;
  actorId?: string;
  type: NotificationType;
  logId?: string;
  albumId?: string;
  dedupeKey?: string;
}) {
  if (actorId && userId === actorId) return null;

  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: { [prefByType[type]]: true },
  });
  if (!recipient || !recipient[prefByType[type]]) return null;

  if (dedupeKey) {
    return prisma.notification.upsert({
      where: { dedupeKey },
      update: {},
      create: { userId, actorId, type, logId, albumId, dedupeKey },
    });
  }
  return prisma.notification.create({
    data: { userId, actorId, type, logId, albumId },
  });
}
