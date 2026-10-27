import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggles following an artist (drives the release calendar and release-day notifications).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: artistId } = await params;

  const artist = await prisma.artist.findUnique({ where: { id: artistId }, select: { id: true } });
  if (!artist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = { userId_artistId: { userId: session.user.id, artistId } };
  const existing = await prisma.artistFollow.findUnique({ where: key });
  if (existing) {
    await prisma.artistFollow.delete({ where: key });
    return NextResponse.json({ following: false });
  }
  await prisma.artistFollow.create({ data: { userId: session.user.id, artistId } });
  return NextResponse.json({ following: true });
}
