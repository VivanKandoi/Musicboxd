import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Quick search for the command palette. Kept small and selective: it runs on every keystroke.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) return NextResponse.json({ albums: [], artists: [], users: [] });

  const [albums, artists, users] = await Promise.all([
    prisma.album.findMany({
      where: {
        OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }],
      },
      take: 8,
      select: {
        id: true,
        title: true,
        coverUrl: true,
        releaseDate: true,
        artist: { select: { name: true } },
      },
    }),
    prisma.artist.findMany({
      where: { name: { contains: q } },
      take: 4,
      select: { id: true, name: true, _count: { select: { albums: true } } },
    }),
    prisma.user.findMany({
      where: { OR: [{ username: { contains: q } }, { name: { contains: q } }] },
      take: 4,
      select: { id: true, username: true, name: true, avatarUrl: true },
    }),
  ]);

  return NextResponse.json({ albums, artists, users });
}
