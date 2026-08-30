import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { albumId, rating, reviewText, listenedAt, isRelisten } = parsed.data;

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const log = await prisma.log.create({
    data: {
      userId: session.user.id,
      albumId,
      rating: rating ?? null,
      reviewText: reviewText || null,
      listenedAt: listenedAt ? new Date(listenedAt) : new Date(),
      isRelisten: isRelisten ?? false,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
