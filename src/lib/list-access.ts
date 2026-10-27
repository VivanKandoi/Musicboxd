import { generateKeyBetween } from "fractional-indexing";
import { prisma } from "@/lib/prisma";

export type ListRole = "owner" | "editor";

export async function getListAccess(listId: string, userId: string | null | undefined) {
  const list = await prisma.rankedList.findUnique({ where: { id: listId } });
  if (!list) return null;

  const membership = userId
    ? await prisma.listMember.findUnique({
        where: { listId_userId: { listId, userId } },
      })
    : null;
  const role = (membership?.role as ListRole | undefined) ?? null;

  return {
    list,
    role,
    canView: list.isPublic || role !== null,
    canEditItems: role !== null,
    canManage: role === "owner",
  };
}

// Places an item directly after `prevItemId` (or at the top when null), looking up
// neighbours from the current order so a stale client still produces a valid key.
export async function rankAfter(listId: string, prevItemId: string | null, excludeItemId?: string) {
  const items = await prisma.rankedListItem.findMany({
    where: { listId, ...(excludeItemId ? { id: { not: excludeItemId } } : {}) },
    orderBy: { rank: "asc" },
    select: { id: true, rank: true },
  });

  if (prevItemId === null) {
    return generateKeyBetween(null, items[0]?.rank ?? null);
  }

  const index = items.findIndex((i) => i.id === prevItemId);
  if (index === -1) return null;
  return generateKeyBetween(items[index].rank, items[index + 1]?.rank ?? null);
}

export async function rankAtEnd(listId: string) {
  const last = await prisma.rankedListItem.findFirst({
    where: { listId },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });
  return generateKeyBetween(last?.rank ?? null, null);
}
