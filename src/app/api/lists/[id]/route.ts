import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankedListSchema } from "@/lib/validations";
import { getListAccess } from "@/lib/list-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const access = await getListAccess(id, session.user.id);
  if (!access?.canManage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = rankedListSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const list = await prisma.rankedList.update({ where: { id }, data: parsed.data });
  return NextResponse.json(list);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const access = await getListAccess(id, session.user.id);
  if (!access?.canManage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.rankedList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
