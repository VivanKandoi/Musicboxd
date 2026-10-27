import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listConversations } from "@/lib/dm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await listConversations(session.user.id);
  return NextResponse.json({
    conversations,
    totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
  });
}
