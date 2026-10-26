import { prisma } from "@/lib/prisma";

// Every premium check goes through hasEntitlement, so swapping the mock toggle for real
// billing (e.g. a Stripe webhook that grants rows with source = "stripe") changes nothing else.
export const PREMIUM_FEATURES = {
  custom_covers: "Custom album covers in your own views",
} as const;

export type Feature = keyof typeof PREMIUM_FEATURES;

export async function hasEntitlement(userId: string | null | undefined, feature: Feature) {
  if (!userId) return false;
  const row = await prisma.entitlement.findUnique({
    where: { userId_feature: { userId, feature } },
  });
  return Boolean(row);
}

export async function isPremium(userId: string | null | undefined) {
  if (!userId) return false;
  const count = await prisma.entitlement.count({
    where: { userId, feature: { in: Object.keys(PREMIUM_FEATURES) } },
  });
  return count === Object.keys(PREMIUM_FEATURES).length;
}

export async function setMockPremium(userId: string, enabled: boolean) {
  const features = Object.keys(PREMIUM_FEATURES) as Feature[];
  if (enabled) {
    await prisma.$transaction(
      features.map((feature) =>
        prisma.entitlement.upsert({
          where: { userId_feature: { userId, feature } },
          update: {},
          create: { userId, feature, source: "mock" },
        })
      )
    );
  } else {
    await prisma.entitlement.deleteMany({ where: { userId, source: "mock" } });
  }
}

type CoverHolder = { id: string; coverUrl: string | null };

export async function getCoverOverrides(viewerId: string | null | undefined, albumIds: string[]) {
  if (!viewerId || albumIds.length === 0) return new Map<string, string>();
  if (!(await hasEntitlement(viewerId, "custom_covers"))) return new Map<string, string>();
  const overrides = await prisma.customCover.findMany({
    where: { userId: viewerId, albumId: { in: [...new Set(albumIds)] } },
  });
  return new Map(overrides.map((o) => [o.albumId, o.imageUrl]));
}

// Swaps in the viewer's own cover overrides (only while they still have the feature).
// `pick` returns the album object inside each row; it is updated in place, which is safe
// because rows are fresh per-request query results.
export async function applyCustomCovers<T>(
  viewerId: string | null | undefined,
  rows: T[],
  pick: (row: T) => CoverHolder | null | undefined
): Promise<T[]> {
  const albums = rows.map(pick).filter((a): a is CoverHolder => Boolean(a));
  const byAlbum = await getCoverOverrides(viewerId, albums.map((a) => a.id));
  for (const album of albums) {
    const url = byAlbum.get(album.id);
    if (url) album.coverUrl = url;
  }
  return rows;
}
