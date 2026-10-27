// Matches external (Last.fm) album entries to the catalog.
// Order: exact release-group MBID, then artist MBID + fuzzy title, then fuzzy artist + title.
// Confident, unambiguous matches are auto-linked; close calls go to a review queue.

export const AUTO_MATCH_SCORE = 0.9;
export const REVIEW_MIN_SCORE = 0.6;
const AMBIGUITY_MARGIN = 0.05;
const ARTIST_FUZZY_MIN = 0.75;

const EDITION_WORDS =
  "deluxe|remaster(?:ed)?|edition|version|expanded|anniversary|bonus|explicit|clean|mono|stereo|reissue|special|collector'?s|super";

export function normalizeTitle(raw: string) {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(new RegExp(`\\s*[([][^)\\]]*(?:${EDITION_WORDS})[^)\\]]*[)\\]]`, "g"), "")
    .replace(new RegExp(`\\s+[-–]\\s+.*(?:${EDITION_WORDS}|single|ep).*$`), "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeArtist(raw: string) {
  return normalizeTitle(raw).replace(/^the /, "");
}

function bigrams(s: string) {
  const compact = s.replace(/ /g, "");
  const grams = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i++) {
    const g = compact.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return { grams, size: Math.max(0, compact.length - 1) };
}

// Sørensen–Dice coefficient over character bigrams, 0..1.
export function similarity(a: string, b: string) {
  if (a === b) return a.length > 0 ? 1 : 0;
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let overlap = 0;
  for (const [g, n] of A.grams) overlap += Math.min(n, B.grams.get(g) ?? 0);
  return (2 * overlap) / (A.size + B.size);
}

export type CatalogAlbum = {
  id: string;
  title: string;
  musicbrainzId: string | null;
  artist: { id: string; name: string; musicbrainzId: string | null };
};

export type MatchCandidate = { albumId: string; title: string; artist: string; score: number };

export type MatchResult =
  | { status: "matched"; albumId: string; score: number; method: "mbid" | "fuzzy" }
  | { status: "review"; candidates: MatchCandidate[] }
  | { status: "unmatched" };

export type ExternalAlbum = {
  artist: string;
  album: string;
  albumMbid: string | null;
  artistMbid: string | null;
};

export function buildMatcher(catalog: CatalogAlbum[]) {
  const rows = catalog.map((a) => ({
    ...a,
    normTitle: normalizeTitle(a.title),
    normArtist: normalizeArtist(a.artist.name),
  }));
  const byMbid = new Map(rows.filter((r) => r.musicbrainzId).map((r) => [r.musicbrainzId!, r]));
  const byArtistMbid = new Map<string, typeof rows>();
  const byArtistName = new Map<string, typeof rows>();
  for (const r of rows) {
    if (r.artist.musicbrainzId) {
      byArtistMbid.set(r.artist.musicbrainzId, [...(byArtistMbid.get(r.artist.musicbrainzId) ?? []), r]);
    }
    byArtistName.set(r.normArtist, [...(byArtistName.get(r.normArtist) ?? []), r]);
  }
  const artistNames = [...byArtistName.keys()];

  return function match(entry: ExternalAlbum): MatchResult {
    if (entry.albumMbid) {
      const exact = byMbid.get(entry.albumMbid);
      if (exact) return { status: "matched", albumId: exact.id, score: 1, method: "mbid" };
    }

    const normArtist = normalizeArtist(entry.artist);
    const normTitle = normalizeTitle(entry.album);

    let pool: { row: (typeof rows)[number]; artistScore: number }[] = [];
    const mbidArtist = entry.artistMbid ? byArtistMbid.get(entry.artistMbid) : undefined;
    if (mbidArtist) {
      pool = mbidArtist.map((row) => ({ row, artistScore: 1 }));
    } else if (byArtistName.has(normArtist)) {
      pool = byArtistName.get(normArtist)!.map((row) => ({ row, artistScore: 1 }));
    } else {
      for (const name of artistNames) {
        const s = similarity(normArtist, name);
        if (s >= ARTIST_FUZZY_MIN) {
          pool.push(...byArtistName.get(name)!.map((row) => ({ row, artistScore: s })));
        }
      }
    }

    const scored = pool
      .map(({ row, artistScore }) => ({
        row,
        score: 0.75 * similarity(normTitle, row.normTitle) + 0.25 * artistScore,
      }))
      .sort((a, b) => b.score - a.score);

    const [best, second] = scored;
    if (!best || best.score < REVIEW_MIN_SCORE) return { status: "unmatched" };

    const unambiguous = !second || second.score < best.score - AMBIGUITY_MARGIN;
    if (best.score >= AUTO_MATCH_SCORE && unambiguous) {
      return { status: "matched", albumId: best.row.id, score: best.score, method: "fuzzy" };
    }

    return {
      status: "review",
      candidates: scored
        .filter((s) => s.score >= REVIEW_MIN_SCORE - 0.1)
        .slice(0, 3)
        .map((s) => ({
          albumId: s.row.id,
          title: s.row.title,
          artist: s.row.artist.name,
          score: Math.round(s.score * 100) / 100,
        })),
    };
  };
}
