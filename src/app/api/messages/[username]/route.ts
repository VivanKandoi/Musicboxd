import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import {
  canMessage,
  findDirectConversation,
  getOrCreateDirectConversation,
  markConversationRead,
} from "@/lib/dm";
import { createNotification } from "@/lib/notifications";

const messageInclude = {
  sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
  sharedAlbum: {
    select: { id: true, title: true, coverUrl: true, artist: { select: { name: true } } },
  },
  sharedLog: {
    select: {
      id: true,
      rating: true,
      reviewText: true,
      album: { select: { id: true, title: true, coverUrl: true, artist: { select: { name: true } } } },
    },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await params;

  const other = await prisma.user.findUnique({ where: { username } });
  if (!other) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const conversation = await findDirectConversation(session.user.id, other.id);
  const messages = conversation
    ? await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        include: messageInclude,
      })
    : [];
  if (conversation) await markConversationRead(conversation.id, session.user.id);

  return NextResponse.json({
    messages,
    other: { id: other.id, username: other.username, name: other.name, avatarUrl: other.avatarUrl },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await params;

  const recipient = await prisma.user.findUnique({ where: { username } });
  if (!recipient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  if (!parsed.data.text && !parsed.data.sharedAlbumId && !parsed.data.sharedLogId) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  const allowed = await canMessage(session.user.id, recipient.id);
  if (!allowed) {
    return NextResponse.json(
      { error: `@${recipient.username} isn't accepting messages from you` },
      { status: 403 }
    );
  }

  const conversation = await getOrCreateDirectConversation(session.user.id, recipient.id);
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        text: parsed.data.text || null,
        sharedAlbumId: parsed.data.sharedAlbumId || null,
        sharedLogId: parsed.data.sharedLogId || null,
      },
      include: messageInclude,
    }),
    prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conversation.id, userId: session.user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  await createNotification({
    userId: recipient.id,
    actorId: session.user.id,
    type: "message",
  });

  return NextResponse.json(message, { status: 201 });
}
