import { prisma } from "@/lib/prisma";

export type Badge = {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  progress: number; // 0-1
};

const LOG_MILESTONES = [10, 50, 100, 250, 500];

export async function computeBadges(userId: string): Promise<Badge[]> {
  const [totalLogs, distinctGenreCount, fiveStarDebutCount, reviewCount] =
    await Promise.all([
      prisma.log.count({ where: { userId } }),
      prisma.albumGenre
        .findMany({
          where: { album: { logs: { some: { userId } } } },
          select: { genreId: true },
          distinct: ["genreId"],
        })
        .then((rows) => rows.length),
      countFiveStarDebuts(userId),
      prisma.log.count({
        where: { userId, reviewText: { not: null } },
      }),
    ]);

  const milestoneBadges: Badge[] = LOG_MILESTONES.map((n) => ({
    id: `logs-${n}`,
    label: `${n} albums logged`,
    description: `Log ${n} albums to earn this badge.`,
    achieved: totalLogs >= n,
    progress: Math.min(1, totalLogs / n),
  }));

  return [
    ...milestoneBadges,
    {
      id: "genre-explorer",
      label: "Genre explorer",
      description: "Log albums across 10 different genres.",
      achieved: distinctGenreCount >= 10,
      progress: Math.min(1, distinctGenreCount / 10),
    },
    {
      id: "debut-devotee",
      label: "Debut devotee",
      description: "Rate 10 debut albums 5 stars.",
      achieved: fiveStarDebutCount >= 10,
      progress: Math.min(1, fiveStarDebutCount / 10),
    },
    {
      id: "critic",
      label: "Critic",
      description: "Write 25 reviews.",
      achieved: reviewCount >= 25,
      progress: Math.min(1, reviewCount / 25),
    },
  ];
}

async function countFiveStarDebuts(userId: string) {
  const fiveStarLogs = await prisma.log.findMany({
    where: { userId, rating: 5 },
    select: {
      album: {
        select: { id: true, releaseDate: true, artistId: true },
      },
    },
    distinct: ["albumId"],
  });
  if (fiveStarLogs.length === 0) return 0;

  const artistIds = [...new Set(fiveStarLogs.map((l) => l.album.artistId))];
  const earliestByArtist = await prisma.album.groupBy({
    by: ["artistId"],
    where: { artistId: { in: artistIds } },
    _min: { releaseDate: true },
  });
  const earliestMap = new Map(
    earliestByArtist.map((e) => [e.artistId, e._min.releaseDate?.getTime() ?? null])
  );

  return fiveStarLogs.filter((l) => {
    const earliest = earliestMap.get(l.album.artistId);
    const albumTime = l.album.releaseDate?.getTime() ?? null;
    return earliest != null && albumTime != null && albumTime === earliest;
  }).length;
}
