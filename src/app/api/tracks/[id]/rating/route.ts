import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackRatingSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: trackId } = await params;

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = trackRatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { rating } = parsed.data;

  if (rating === null) {
    await prisma.trackRating.deleteMany({
      where: { userId: session.user.id, trackId },
    });
  } else {
    await prisma.trackRating.upsert({
      where: { userId_trackId: { userId: session.user.id, trackId } },
      update: { rating },
      create: { userId: session.user.id, trackId, rating },
    });
  }

  const agg = await prisma.trackRating.aggregate({
    where: { trackId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return NextResponse.json({
    rating,
    avgRating: agg._avg.rating,
    ratingCount: agg._count.rating,
  });
}
