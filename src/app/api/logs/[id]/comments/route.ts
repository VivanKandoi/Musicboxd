import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validations";

export async function POST(
  request: Request,
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

  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: { logId, userId: session.user.id, text: parsed.data.text },
    include: { user: { select: { username: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
