import { prisma } from "@/lib/prisma";

export type Recommendation = {
  id: string;
  title: string;
  coverUrl: string | null;
  artist: string;
  reasons: string[];
};

export async function getRecommendations(userId: string, take = 6): Promise<Recommendation[]> {
  const lovedLogs = await prisma.log.findMany({
    where: { userId, rating: { gte: 4 } },
    select: { albumId: true },
  });
  const lovedAlbumIds = [...new Set(lovedLogs.map((l) => l.albumId))];
  if (lovedAlbumIds.length === 0) return [];

  const loggedAlbumIds = await prisma.log
    .findMany({ where: { userId }, select: { albumId: true }, distinct: ["albumId"] })
    .then((rows) => rows.map((r) => r.albumId));

  const genreRows = await prisma.albumGenre.findMany({
    where: { albumId: { in: lovedAlbumIds } },
    select: { genreId: true, genre: { select: { name: true } } },
  });
  const genreCounts = new Map<string, { name: string; count: number }>();
  for (const r of genreRows) {
    const entry = genreCounts.get(r.genreId) ?? { name: r.genre.name, count: 0 };
    entry.count += 1;
    genreCounts.set(r.genreId, entry);
  }
  const topGenreIds = Array.from(genreCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id]) => id);

  const lovedAlbums = await prisma.album.findMany({
    where: { id: { in: lovedAlbumIds } },
    select: { artistId: true },
  });
  const lovedArtistIds = [...new Set(lovedAlbums.map((a) => a.artistId))];

  const similarUserRows = await prisma.log.findMany({
    where: { albumId: { in: lovedAlbumIds }, rating: { gte: 4 }, userId: { not: userId } },
    select: { userId: true },
  });
  const similarUserIds = [...new Set(similarUserRows.map((r) => r.userId))];

  const similarLovedRows = similarUserIds.length
    ? await prisma.log.findMany({
        where: {
          userId: { in: similarUserIds },
          rating: { gte: 4 },
          albumId: { notIn: loggedAlbumIds },
        },
        select: { albumId: true },
      })
    : [];
  const similarLovedCounts = new Map<string, number>();
  for (const r of similarLovedRows) {
    similarLovedCounts.set(r.albumId, (similarLovedCounts.get(r.albumId) ?? 0) + 1);
  }

  const candidates = await prisma.album.findMany({
    where: {
      id: { notIn: loggedAlbumIds },
      OR: [
        { genres: { some: { genreId: { in: topGenreIds } } } },
        { artistId: { in: lovedArtistIds } },
        { id: { in: Array.from(similarLovedCounts.keys()) } },
      ],
    },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      artistId: true,
      artist: { select: { name: true } },
      genres: { select: { genreId: true, genre: { select: { name: true } } } },
    },
    take: 300,
  });

  const scored = candidates.map((c) => {
    const matchedGenres = c.genres
      .filter((g) => topGenreIds.includes(g.genreId))
      .map((g) => g.genre.name);
    const artistMatch = lovedArtistIds.includes(c.artistId);
    const similarBoost = similarLovedCounts.get(c.id) ?? 0;
    const score = matchedGenres.length * 2 + (artistMatch ? 3 : 0) + similarBoost;

    const reasons: string[] = [];
    if (artistMatch) reasons.push(`More from ${c.artist.name}`);
    if (matchedGenres.length > 0) reasons.push(`Shares genre: ${matchedGenres[0]}`);
    if (similarBoost > 0) reasons.push("Loved by listeners with similar taste");

    return { c, score, reasons };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map(({ c, reasons }) => ({
      id: c.id,
      title: c.title,
      coverUrl: c.coverUrl,
      artist: c.artist.name,
      reasons,
    }));
}
