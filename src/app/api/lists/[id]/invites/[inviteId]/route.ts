import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListAccess } from "@/lib/list-access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId, inviteId } = await params;

  const access = await getListAccess(listId, session.user.id);
  const invite = await prisma.listInvite.findUnique({ where: { id: inviteId } });
  if (!access?.canManage || !invite || invite.listId !== listId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
