import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/text-embedder";

// Semantic Discovery, following "Semantic Music Retrieval Through Multimodal Fusion of
// Audio, Lyrics, and User-Generated Reviews" (Kandoi, Panda, Singh, Viz):
//   (1) cosine similarity per modality, (2) z-score over the whole catalogue (population SD),
//   (3) equal-weight mean of the selected modalities' z-scores, then rank.
// Lyrics-only was rated best in the survey and is the default; Lyrics + Reviews was best for
// romantic and nostalgic queries. Audio-based systems need the CLAP text encoder at query
// time, which isn't available here; CLAP audio vectors are used for song-to-song similarity.

export type TextSpace = "lyrics" | "reviews";
export type Space = TextSpace | "audio";

export const SYSTEMS = {
  lyrics: { label: "Lyrics", spaces: ["lyrics"] as TextSpace[] },
  "lyrics+reviews": { label: "Lyrics + listener reviews", spaces: ["lyrics", "reviews"] as TextSpace[] },
} as const;
export type SystemId = keyof typeof SYSTEMS;

export const QUADRANTS = {
  Q1: "Happy & energetic",
  Q2: "Tense & intense",
  Q3: "Sad & subdued",
  Q4: "Calm & content",
} as const;
export type Quadrant = keyof typeof QUADRANTS;

type Matrix = { dim: number; data: Float32Array; present: Uint8Array };

type Index = {
  trackIds: string[];
  rowOf: Map<string, number>;
  quadrant: (string | null)[];
  year: (number | null)[];
  spaces: Partial<Record<Space, Matrix>>;
  loadedAt: number;
};

// ---------- pure scoring (exported for the parity check) ----------

export function cosineAll(query: Float32Array, m: Matrix) {
  const rows = m.present.length;
  const out = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    if (!m.present[i]) {
      out[i] = Number.NaN;
      continue;
    }
    let s = 0;
    const o = i * m.dim;
    for (let j = 0; j < m.dim; j++) s += query[j] * m.data[o + j];
    out[i] = s; // vectors are unit length, so the dot product is the cosine
  }
  return out;
}

export function zScores(values: Float64Array) {
  let n = 0;
  let mean = 0;
  for (const v of values) {
    if (Number.isNaN(v)) continue;
    n += 1;
    mean += v;
  }
  mean /= n;
  let variance = 0;
  for (const v of values) if (!Number.isNaN(v)) variance += (v - mean) ** 2;
  const sd = Math.sqrt(variance / n) || 1;
  return values.map((v) => (Number.isNaN(v) ? Number.NaN : (v - mean) / sd));
}

export function fuse(zs: Float64Array[]) {
  const out = new Float64Array(zs[0].length);
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (const z of zs) s += z[i];
    out[i] = s / zs.length; // NaN if any selected modality is missing for this song
  }
  return out;
}

// Share of the catalogue scoring below each song (0..1), for "top 3% lyric match" style text.
function percentiles(values: Float64Array) {
  const order = [...values.keys()].filter((i) => !Number.isNaN(values[i])).sort((a, b) => values[a] - values[b]);
  const out = new Float64Array(values.length).fill(Number.NaN);
  order.forEach((row, rank) => (out[row] = order.length > 1 ? rank / (order.length - 1) : 1));
  return out;
}

// ---------- index ----------

const INDEX_TTL_MS = 10 * 60 * 1000;
let indexCache: Promise<Index> | null = null;

function toFloat32(bytes: Uint8Array, dim: number) {
  // Copy: Prisma's Buffer may not be 4-byte aligned for a Float32Array view.
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + dim * 4));
}

async function buildIndex(): Promise<Index> {
  const tracks = await prisma.track.findMany({
    where: { embeddings: { some: { space: "lyrics" } } },
    select: { id: true, quadrant: true, songTags: true },
    orderBy: { allmusicId: "asc" },
  });
  const trackIds = tracks.map((t) => t.id);
  const rowOf = new Map(trackIds.map((id, i) => [id, i]));

  const spaces: Partial<Record<Space, Matrix>> = {};
  for (const space of ["lyrics", "reviews", "audio"] as Space[]) {
    const rows = await prisma.trackEmbedding.findMany({ where: { space }, select: { trackId: true, dim: true, vector: true } });
    if (rows.length === 0) continue;
    const dim = rows[0].dim;
    const data = new Float32Array(trackIds.length * dim);
    const present = new Uint8Array(trackIds.length);
    for (const r of rows) {
      const i = rowOf.get(r.trackId);
      if (i === undefined || r.dim !== dim) continue;
      data.set(toFloat32(r.vector, dim), i * dim);
      present[i] = 1;
    }
    spaces[space] = { dim, data, present };
  }

  return {
    trackIds,
    rowOf,
    quadrant: tracks.map((t) => t.quadrant),
    year: tracks.map((t) => {
      const y = (t.songTags as { year?: number } | null)?.year;
      return typeof y === "number" ? y : null;
    }),
    spaces,
    loadedAt: Date.now(),
  };
}

export async function loadIndex() {
  if (indexCache) {
    const index = await indexCache;
    if (Date.now() - index.loadedAt < INDEX_TTL_MS) return index;
  }
  indexCache = buildIndex().catch((err) => {
    indexCache = null;
    throw err;
  });
  return indexCache;
}

export async function semanticCatalogSize() {
  return (await loadIndex()).trackIds.length;
}

// ---------- search ----------

export type ModalityScore = { cosine: number; z: number; percentile: number };

export type SemanticHit = {
  trackId: string;
  score: number;
  lyrics: ModalityScore | null;
  reviews: ModalityScore | null;
};

async function scoreQuery(query: string, system: SystemId) {
  const index = await loadIndex();
  if (index.trackIds.length === 0 || !query.trim()) return null;

  const q = await embedText(query);
  const per: Partial<Record<TextSpace, { cos: Float64Array; z: Float64Array; pct: Float64Array }>> = {};
  for (const space of ["lyrics", "reviews"] as TextSpace[]) {
    const m = index.spaces[space];
    if (!m) continue;
    const cos = cosineAll(q, m);
    per[space] = { cos, z: zScores(cos), pct: percentiles(cos) };
  }

  const selected = SYSTEMS[system].spaces.filter((s) => per[s]);
  if (selected.length === 0) return null;
  const score = selected.length === 1 ? per[selected[0]]!.z : fuse(selected.map((s) => per[s]!.z));
  const describe = (space: TextSpace, i: number): ModalityScore | null =>
    per[space] && !Number.isNaN(per[space]!.cos[i])
      ? { cosine: per[space]!.cos[i], z: per[space]!.z[i], percentile: per[space]!.pct[i] }
      : null;
  return { index, score, describe };
}

// How one song scores for a query, with its overall rank in the catalogue.
export async function explainMatch(query: string, trackId: string, system: SystemId = "lyrics") {
  const scored = await scoreQuery(query, system);
  const row = scored?.index.rowOf.get(trackId);
  if (!scored || row === undefined || Number.isNaN(scored.score[row])) return null;
  let rank = 1;
  for (const s of scored.score) if (s > scored.score[row]) rank += 1;
  return {
    score: scored.score[row],
    rank,
    catalogueSize: scored.index.trackIds.length,
    lyrics: scored.describe("lyrics", row),
    reviews: scored.describe("reviews", row),
  };
}

export async function semanticSearch(
  query: string,
  options: { system?: SystemId; limit?: number; quadrants?: Quadrant[]; decade?: number | null } = {}
): Promise<SemanticHit[]> {
  const { system = "lyrics", limit = 20, quadrants = [], decade = null } = options;
  const scored = await scoreQuery(query, system);
  if (!scored) return [];
  const { index, score, describe } = scored;

  // Filters narrow the result list; z-scores stay relative to the full catalogue, as in the paper.
  const rows = [...score.keys()].filter((i) => {
    if (Number.isNaN(score[i])) return false;
    if (quadrants.length && !quadrants.includes(index.quadrant[i] as Quadrant)) return false;
    if (decade !== null && (index.year[i] === null || Math.floor(index.year[i]! / 10) * 10 !== decade)) return false;
    return true;
  });
  rows.sort((a, b) => score[b] - score[a]);

  return rows.slice(0, limit).map((i) => ({
    trackId: index.trackIds[i],
    score: score[i],
    lyrics: describe("lyrics", i),
    reviews: describe("reviews", i),
  }));
}

// Nearest neighbours of one song in a given space (e.g. "audio" = sounds similar).
export async function similarTracks(trackId: string, space: Space, limit = 6) {
  const index = await loadIndex();
  const m = index.spaces[space];
  const row = index.rowOf.get(trackId);
  if (!m || row === undefined || !m.present[row]) return [];
  const vector = m.data.subarray(row * m.dim, (row + 1) * m.dim);
  const cos = cosineAll(vector, m);
  return [...cos.keys()]
    .filter((i) => i !== row && !Number.isNaN(cos[i]))
    .sort((a, b) => cos[b] - cos[a])
    .slice(0, limit)
    .map((i) => ({ trackId: index.trackIds[i], cosine: cos[i] }));
}
