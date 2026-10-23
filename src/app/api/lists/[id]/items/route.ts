import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankedListItemSchema } from "@/lib/validations";
import { getListAccess, rankAtEnd } from "@/lib/list-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId } = await params;

  const access = await getListAccess(listId, session.user.id);
  if (!access?.canEditItems) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = rankedListItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const album = await prisma.album.findUnique({ where: { id: parsed.data.albumId } });
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const existing = await prisma.rankedListItem.findUnique({
    where: { listId_albumId: { listId, albumId: parsed.data.albumId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already in this list" }, { status: 400 });
  }

  const item = await prisma.rankedListItem.create({
    data: {
      listId,
      albumId: parsed.data.albumId,
      note: parsed.data.note || null,
      rank: await rankAtEnd(listId),
      addedById: session.user.id,
    },
  });

  await prisma.rankedList.update({ where: { id: listId }, data: { updatedAt: new Date() } });

  return NextResponse.json(item, { status: 201 });
}
