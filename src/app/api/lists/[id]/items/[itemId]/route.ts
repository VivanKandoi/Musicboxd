import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moveItemSchema } from "@/lib/validations";
import { getListAccess, rankAfter } from "@/lib/list-access";

async function loadItem(listId: string, itemId: string, userId: string) {
  const access = await getListAccess(listId, userId);
  if (!access?.canEditItems) return null;
  const item = await prisma.rankedListItem.findUnique({ where: { id: itemId } });
  if (!item || item.listId !== listId) return null;
  return item;
}

// Reorder: the client says which item should sit directly above this one
// (null = top). Only the moved row is rewritten; concurrent edits are last-write-wins.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId, itemId } = await params;

  const item = await loadItem(listId, itemId, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = moveItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const rank = await rankAfter(listId, parsed.data.afterItemId, itemId);
  if (!rank) {
    return NextResponse.json({ error: "That item is no longer in the list" }, { status: 409 });
  }

  const updated = await prisma.rankedListItem.update({ where: { id: itemId }, data: { rank } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId, itemId } = await params;

  const item = await loadItem(listId, itemId, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.rankedListItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
