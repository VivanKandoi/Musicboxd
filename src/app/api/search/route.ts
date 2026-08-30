import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ albums: [] });

  const albums = await prisma.album.findMany({
    where: {
      OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }],
    },
    take: 10,
    include: { artist: { select: { name: true } } },
  });

  return NextResponse.json({ albums });
}
