import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListAccess } from "@/lib/list-access";

// The owner can remove an editor; an editor can remove themselves (leave the list).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId, userId } = await params;

  const access = await getListAccess(listId, session.user.id);
  const isSelf = userId === session.user.id;
  if (!access || (!access.canManage && !(isSelf && access.role === "editor"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (member.role === "owner") {
    return NextResponse.json({ error: "The owner can't be removed" }, { status: 400 });
  }

  await prisma.listMember.delete({ where: { listId_userId: { listId, userId } } });
  return NextResponse.json({ ok: true });
}
