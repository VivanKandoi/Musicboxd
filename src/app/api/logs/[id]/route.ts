import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSchema } from "@/lib/validations";
import { syncLogTags } from "@/lib/tags";
import { invalidateYearStats } from "@/lib/year-in-review";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { logId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { username: true, name: true } } },
  });
  return NextResponse.json({ comments });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.log.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = logSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { rating, reviewText, listenedAt, isRelisten, tags } = parsed.data;
  const log = await prisma.log.update({
    where: { id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(reviewText !== undefined ? { reviewText: reviewText || null } : {}),
      ...(listenedAt !== undefined ? { listenedAt: new Date(listenedAt) } : {}),
      ...(isRelisten !== undefined ? { isRelisten } : {}),
    },
  });

  if (tags !== undefined) {
    await syncLogTags(id, tags);
  }
  await invalidateYearStats(session.user.id, [
    existing.listenedAt.getUTCFullYear(),
    log.listenedAt.getUTCFullYear(),
  ]);

  return NextResponse.json(log);
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

  const existing = await prisma.log.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.log.delete({ where: { id } });
  await invalidateYearStats(session.user.id, [existing.listenedAt.getUTCFullYear()]);
  return NextResponse.json({ ok: true });
}
