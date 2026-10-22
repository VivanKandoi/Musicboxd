import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });

  const conversations = new Map<
    string,
    {
      user: { id: string; username: string; name: string | null; avatarUrl: string | null };
      lastMessage: (typeof messages)[number];
      unreadCount: number;
    }
  >();

  for (const m of messages) {
    const other = m.senderId === userId ? m.recipient : m.sender;
    const existing = conversations.get(other.id);
    const isUnreadForMe = m.recipientId === userId && !m.readAt;
    if (!existing) {
      conversations.set(other.id, {
        user: other,
        lastMessage: m,
        unreadCount: isUnreadForMe ? 1 : 0,
      });
    } else if (isUnreadForMe) {
      existing.unreadCount += 1;
    }
  }

  return NextResponse.json({
    conversations: Array.from(conversations.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    ),
    totalUnread: Array.from(conversations.values()).reduce((sum, c) => sum + c.unreadCount, 0),
  });
}
