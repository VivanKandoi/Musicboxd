import { prisma } from "@/lib/prisma";

export function directKey(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(":");
}

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

export function findDirectConversation(userIdA: string, userIdB: string) {
  return prisma.conversation.findUnique({ where: { directKey: directKey(userIdA, userIdB) } });
}

export async function getOrCreateDirectConversation(userIdA: string, userIdB: string) {
  const key = directKey(userIdA, userIdB);
  return prisma.conversation.upsert({
    where: { directKey: key },
    update: {},
    create: {
      directKey: key,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
  });
}

const userSelect = { id: true, username: true, name: true, avatarUrl: true } as const;

export async function listConversations(userId: string) {
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: "desc" } },
    include: {
      conversation: {
        include: {
          participants: { where: { userId: { not: userId } }, include: { user: { select: userSelect } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const conversations = await Promise.all(
    memberships
      .filter((m) => m.conversation.messages.length > 0)
      .map(async (m) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        });
        const others = m.conversation.participants.map((p) => p.user);
        return {
          conversationId: m.conversationId,
          isGroup: m.conversation.isGroup,
          title: m.conversation.title,
          user: others[0],
          others,
          lastMessage: m.conversation.messages[0],
          unreadCount,
        };
      })
  );

  return conversations.filter((c) => c.user);
}

export async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}
