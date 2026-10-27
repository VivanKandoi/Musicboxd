import { prisma } from "@/lib/prisma";

export async function getCompatibility(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) return null;

  const [logsA, logsB] = await Promise.all([
    prisma.log.findMany({
      where: { userId: userIdA, rating: { not: null } },
      select: { albumId: true, rating: true },
    }),
    prisma.log.findMany({
      where: { userId: userIdB, rating: { not: null } },
      select: { albumId: true, rating: true },
    }),
  ]);

  const ratingsA = new Map(logsA.map((l) => [l.albumId, l.rating as number]));
  const ratingsB = new Map(logsB.map((l) => [l.albumId, l.rating as number]));
  const shared = [...ratingsA.keys()].filter((id) => ratingsB.has(id));

  if (shared.length >= 3) {
    const diffs = shared.map((id) => Math.abs(ratingsA.get(id)! - ratingsB.get(id)!));
    const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    const score = Math.max(0, Math.round(100 - (avgDiff / 4.5) * 100));
    return { score, basis: "ratings" as const, sharedCount: shared.length };
  }

  const [genresA, genresB] = await Promise.all([
    prisma.albumGenre.findMany({
      where: { album: { logs: { some: { userId: userIdA } } } },
      select: { genreId: true },
      distinct: ["genreId"],
    }),
    prisma.albumGenre.findMany({
      where: { album: { logs: { some: { userId: userIdB } } } },
      select: { genreId: true },
      distinct: ["genreId"],
    }),
  ]);
  const setA = new Set(genresA.map((g) => g.genreId));
  const setB = new Set(genresB.map((g) => g.genreId));
  if (setA.size === 0 || setB.size === 0) return null;

  const intersection = [...setA].filter((g) => setB.has(g)).length;
  const union = new Set([...setA, ...setB]).size;
  const score = Math.round((intersection / union) * 100);

  return { score, basis: "genres" as const, sharedCount: intersection };
}
