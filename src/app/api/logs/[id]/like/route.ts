import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: logId } = await params;

  const log = await prisma.log.findUnique({ where: { id: logId } });
  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_logId: { userId: session.user.id, logId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    const count = await prisma.like.count({ where: { logId } });
    return NextResponse.json({ liked: false, count });
  }

  await prisma.like.create({
    data: { userId: session.user.id, logId },
  });
  const count = await prisma.like.count({ where: { logId } });
  return NextResponse.json({ liked: true, count });
}
