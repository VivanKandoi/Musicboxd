import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewDecisionSchema } from "@/lib/validations";
import { saveImportedListens, type DailyPlays } from "@/lib/lastfm-import";
import type { MatchCandidate } from "@/lib/import-matching";
import { invalidateYearStats } from "@/lib/year-in-review";

// Resolve one ambiguous import match: pick one of the suggested albums, or reject (null).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const item = await prisma.importReviewItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id || item.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = reviewDecisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { albumId } = parsed.data;

  if (albumId === null) {
    await prisma.$transaction([
      prisma.importReviewItem.update({ where: { id }, data: { status: "rejected" } }),
      prisma.importJob.update({
        where: { id: item.jobId },
        data: { unmatched: { increment: 1 }, queued: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const candidates = item.candidates as unknown as MatchCandidate[];
  if (!candidates.some((c) => c.albumId === albumId)) {
    return NextResponse.json({ error: "Pick one of the suggested albums" }, { status: 400 });
  }

  const listens = await saveImportedListens(
    session.user.id,
    albumId,
    item.listens as unknown as DailyPlays[],
    item.playCount
  );
  await prisma.$transaction([
    prisma.importReviewItem.update({
      where: { id },
      data: { status: "accepted", resolvedAlbumId: albumId },
    }),
    prisma.importJob.update({
      where: { id: item.jobId },
      data: { matched: { increment: 1 }, queued: { decrement: 1 }, listensCreated: { increment: listens } },
    }),
  ]);
  await invalidateYearStats(session.user.id);

  return NextResponse.json({ ok: true, listens });
}
