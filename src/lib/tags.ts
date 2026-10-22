import { prisma } from "@/lib/prisma";

export function normalizeTagNames(raw: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of raw) {
    const trimmed = name.trim().toLowerCase().slice(0, 30);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= 8) break;
  }
  return result;
}

export async function syncLogTags(logId: string, tagNames: string[]) {
  const names = normalizeTagNames(tagNames);

  await prisma.$transaction(async (tx) => {
    await tx.logContextTag.deleteMany({ where: { logId } });
    for (const name of names) {
      const tag = await tx.contextTag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await tx.logContextTag.create({ data: { logId, tagId: tag.id } });
    }
  });
}
