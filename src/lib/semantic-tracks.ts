import { prisma } from "@/lib/prisma";

export type SongTags = { year?: number | null; moods?: string[]; themes?: string[]; styles?: string[]; genres?: string[] };

// Track rows for Semantic Discovery results, in the order given.
export async function loadSemanticTracks(trackIds: string[]) {
  const rows = await prisma.track.findMany({
    where: { id: { in: trackIds } },
    select: {
      id: true,
      title: true,
      quadrant: true,
      songTags: true,
      album: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          artist: { select: { id: true, name: true } },
        },
      },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, { ...r, tags: (r.songTags ?? {}) as SongTags }]));
  return trackIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
