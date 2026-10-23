import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { token } = await params;

  const invite = await prisma.listInvite.findUnique({ where: { token } });
  if (!invite || invite.revokedAt) {
    return NextResponse.json({ error: "This invite link is no longer valid" }, { status: 404 });
  }

  await prisma.listMember.upsert({
    where: { listId_userId: { listId: invite.listId, userId: session.user.id } },
    update: {},
    create: { listId: invite.listId, userId: session.user.id, role: "editor" },
  });

  return NextResponse.json({ listId: invite.listId });
}
