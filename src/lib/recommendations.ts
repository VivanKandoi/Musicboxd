import { prisma } from "@/lib/prisma";

export type Recommendation = {
  id: string;
  title: string;
  coverUrl: string | null;
  artist: string;
  reasons: string[];
};

export type CatalogEntry = {
  id: string;
  title: string;
  coverUrl: string | null;
  artistId: string;
  artistName: string;
  genres: { id: string; name: string }[];
};

export type ListenSignal = {
  userId: string;
  albumId: string;
  rating: number | null;
  source: string;
  playCount: number | null;
};

const LOVED_RATING = 4;
// Imported listens carry no rating, so heavy play counts stand in as an implicit "loved".
const LOVED_IMPORTED_PLAYS = 5;
const TOP_GENRES = 6;

export function lovedAlbumIds(listens: ListenSignal[]) {
  const plays = new Map<string, number>();
  const loved = new Set<string>();
  for (const l of listens) {
    if (l.rating != null && l.rating >= LOVED_RATING) loved.add(l.albumId);
    if (l.source !== "manual") plays.set(l.albumId, (plays.get(l.albumId) ?? 0) + (l.playCount ?? 1));
  }
  for (const [albumId, n] of plays) if (n >= LOVED_IMPORTED_PLAYS) loved.add(albumId);
  return loved;
}

// The "You'll also enjoy" ranker as a pure function, so the app and the offline evaluation
// (scripts/eval-recommendations.ts) run exactly the same algorithm.
// Score = 2 per shared top genre + 3 if by a loved artist + 1 per similar listener who loved it.
// Ties are broken by popularity (distinct listeners), then title.
export function recommend(
  userListens: ListenSignal[],
  otherLovedByUser: Map<string, Set<string>>,
  catalog: Map<string, CatalogEntry>,
  take = 6,
  popularity: Map<string, number> = new Map()
): Recommendation[] {
  const loved = lovedAlbumIds(userListens);
  if (loved.size === 0) return [];
  const logged = new Set(userListens.map((l) => l.albumId));

  const genreCounts = new Map<string, number>();
  const lovedArtists = new Set<string>();
  for (const albumId of loved) {
    const album = catalog.get(albumId);
    if (!album) continue;
    lovedArtists.add(album.artistId);
    for (const g of album.genres) genreCounts.set(g.id, (genreCounts.get(g.id) ?? 0) + 1);
  }
  const topGenres = new Set(
    [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_GENRES)
      .map(([id]) => id)
  );

  const similarLoved = new Map<string, number>();
  for (const theirLoved of otherLovedByUser.values()) {
    if (![...loved].some((id) => theirLoved.has(id))) continue;
    for (const id of theirLoved) {
      if (!logged.has(id)) similarLoved.set(id, (similarLoved.get(id) ?? 0) + 1);
    }
  }

  const scored: { album: CatalogEntry; score: number; reasons: string[] }[] = [];
  for (const album of catalog.values()) {
    if (logged.has(album.id)) continue;
    const matchedGenres = album.genres.filter((g) => topGenres.has(g.id)).map((g) => g.name);
    const artistMatch = lovedArtists.has(album.artistId);
    const similar = similarLoved.get(album.id) ?? 0;
    const score = matchedGenres.length * 2 + (artistMatch ? 3 : 0) + similar;
    if (score === 0) continue;

    const reasons: string[] = [];
    if (artistMatch) reasons.push(`More from ${album.artistName}`);
    if (matchedGenres.length > 0) reasons.push(`Shares genre: ${matchedGenres[0]}`);
    if (similar > 0) reasons.push("Loved by listeners with similar taste");
    scored.push({ album, score, reasons });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        (popularity.get(b.album.id) ?? 0) - (popularity.get(a.album.id) ?? 0) ||
        a.album.title.localeCompare(b.album.title)
    )
    .slice(0, take)
    .map(({ album, reasons }) => ({
      id: album.id,
      title: album.title,
      coverUrl: album.coverUrl,
      artist: album.artistName,
      reasons,
    }));
}

const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache: { at: number; catalog: Map<string, CatalogEntry> } | null = null;

export async function loadCatalogIndex() {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.catalog;
  const albums = await prisma.album.findMany({
    where: { OR: [{ releaseDate: null }, { releaseDate: { lte: new Date() } }] },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      artistId: true,
      artist: { select: { name: true } },
      genres: { select: { genre: { select: { id: true, name: true } } } },
    },
  });
  const catalog = new Map(
    albums.map((a) => [
      a.id,
      {
        id: a.id,
        title: a.title,
        coverUrl: a.coverUrl,
        artistId: a.artistId,
        artistName: a.artist.name,
        genres: a.genres.map((g) => g.genre),
      },
    ])
  );
  catalogCache = { at: Date.now(), catalog };
  return catalog;
}

const signalSelect = { userId: true, albumId: true, rating: true, source: true, playCount: true } as const;

export async function getRecommendations(userId: string, take = 6): Promise<Recommendation[]> {
  const userListens = await prisma.log.findMany({ where: { userId }, select: signalSelect });
  if (lovedAlbumIds(userListens).size === 0) return [];

  const [others, catalog, popularity] = await Promise.all([
    prisma.log.findMany({
      where: { userId: { not: userId }, OR: [{ rating: { gte: LOVED_RATING } }, { source: { not: "manual" } }] },
      select: signalSelect,
    }),
    loadCatalogIndex(),
    albumPopularity(),
  ]);

  const byUser = new Map<string, ListenSignal[]>();
  for (const l of others) byUser.set(l.userId, [...(byUser.get(l.userId) ?? []), l]);
  const otherLoved = new Map([...byUser].map(([id, listens]) => [id, lovedAlbumIds(listens)]));

  return recommend(userListens, otherLoved, catalog, take, popularity);
}

export async function albumPopularity() {
  const rows = await prisma.log.findMany({ distinct: ["userId", "albumId"], select: { albumId: true } });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.albumId, (counts.get(r.albumId) ?? 0) + 1);
  return counts;
}
