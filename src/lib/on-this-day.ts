import { prisma } from "@/lib/prisma";

export async function getOnThisDay(userId: string) {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  const candidates = await prisma.log.findMany({
    where: {
      userId,
      undated: false,
      listenedAt: { lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    },
    orderBy: { listenedAt: "desc" },
    include: {
      album: {
        select: { id: true, title: true, coverUrl: true, artist: { select: { name: true } } },
      },
    },
  });

  return candidates.filter((log) => {
    const d = new Date(log.listenedAt);
    return d.getMonth() === month && d.getDate() === day && d.getFullYear() < now.getFullYear();
  });
}
