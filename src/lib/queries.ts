import { prisma } from "@/lib/prisma";

const logInclude = {
  user: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
  album: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      artist: { select: { name: true } },
    },
  },
  _count: { select: { likes: true, comments: true } },
} as const;

export type FeedLog = Awaited<ReturnType<typeof getFeedLogs>>[number];

async function attachLikedByMe<
  T extends { id: string; _count: { likes: number; comments: number } }
>(logs: T[], viewerId: string | null) {
  if (!viewerId || logs.length === 0) {
    return logs.map((log) => ({ ...log, likedByMe: false }));
  }
  const liked = await prisma.like.findMany({
    where: { userId: viewerId, logId: { in: logs.map((l) => l.id) } },
    select: { logId: true },
  });
  const likedSet = new Set(liked.map((l) => l.logId));
  return logs.map((log) => ({ ...log, likedByMe: likedSet.has(log.id) }));
}

export async function getFeedLogs(followedUserIds: string[], viewerId: string | null) {
  const logs = await prisma.log.findMany({
    where: { userId: { in: followedUserIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: logInclude,
  });
  return attachLikedByMe(logs, viewerId);
}

export async function getFriendsListening(followedUserIds: string[]) {
  const logs = await prisma.log.findMany({
    where: { userId: { in: followedUserIds } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      album: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          artist: { select: { name: true } },
        },
      },
      user: { select: { username: true } },
    },
  });
  const seen = new Set<string>();
  const unique: typeof logs = [];
  for (const log of logs) {
    if (seen.has(log.albumId)) continue;
    seen.add(log.albumId);
    unique.push(log);
    if (unique.length >= 12) break;
  }
  return unique;
}

export async function getRecentAlbums(take = 12) {
  return prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { artist: { select: { name: true } } },
  });
}

export async function getUserDiary(userId: string, viewerId: string | null, take = 50) {
  const logs = await prisma.log.findMany({
    where: { userId },
    orderBy: { listenedAt: "desc" },
    take,
    include: logInclude,
  });
  return attachLikedByMe(logs, viewerId);
}

export async function getUserStats(userId: string) {
  const [totalLogs, distinctAlbums, ratingAgg, genreRows] = await Promise.all([
    prisma.log.count({ where: { userId } }),
    prisma.log.findMany({
      where: { userId },
      distinct: ["albumId"],
      select: { albumId: true },
    }),
    prisma.log.aggregate({
      where: { userId, rating: { not: null } },
      _avg: { rating: true },
    }),
    prisma.albumGenre.findMany({
      where: { album: { logs: { some: { userId } } } },
      select: { genre: { select: { name: true } } },
    }),
  ]);

  const genreCounts = new Map<string, number>();
  for (const row of genreRows) {
    genreCounts.set(row.genre.name, (genreCounts.get(row.genre.name) ?? 0) + 1);
  }
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  return {
    totalLogs,
    albumsLogged: distinctAlbums.length,
    avgRating: ratingAgg._avg.rating,
    topGenres,
  };
}

export async function getAlbumDetail(id: string) {
  return prisma.album.findUnique({
    where: { id },
    include: {
      artist: true,
      tracks: { orderBy: { trackNumber: "asc" } },
      credits: true,
      genres: { include: { genre: true } },
      _count: { select: { logs: true } },
    },
  });
}

export async function getAlbumRatingSummary(albumId: string) {
  const agg = await prisma.log.aggregate({
    where: { albumId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avgRating: agg._avg.rating, ratingCount: agg._count.rating };
}

export async function getAlbumReviews(albumId: string, viewerId: string | null) {
  const logs = await prisma.log.findMany({
    where: { albumId, reviewText: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: logInclude,
  });
  return attachLikedByMe(logs, viewerId);
}

export async function searchCatalog(q: string) {
  const [albums, artists, users] = await Promise.all([
    prisma.album.findMany({
      where: {
        OR: [{ title: { contains: q } }, { artist: { name: { contains: q } } }],
      },
      take: 20,
      include: { artist: { select: { name: true } } },
    }),
    prisma.artist.findMany({
      where: { name: { contains: q } },
      take: 20,
      include: { albums: { select: { id: true, title: true, coverUrl: true } } },
    }),
    prisma.user.findMany({
      where: {
        OR: [{ username: { contains: q } }, { name: { contains: q } }],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
      },
    }),
  ]);
  return { albums, artists, users };
}
