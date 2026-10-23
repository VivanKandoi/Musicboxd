// Seeds a full year of listens for three demo users so year-in-review has real data to
// show before anyone has a year of history. Deterministic and safe to re-run: it replaces
// only the rows it created (importKey "seed-yir:*").
//   npm run db:seed-year            -> 2025
//   npm run db:seed-year -- 2024
import { prisma } from "../src/lib/prisma";
import { invalidateYearStats } from "../src/lib/year-in-review";

const PROFILES: Record<string, string[]> = {
  vivan: ["Alternative Rock", "Art Rock", "Hip Hop", "Electronic", "Indie Rock"],
  samarpana: ["R&B", "Neo Soul", "Jazz", "Singer-Songwriter", "Folk"],
  saivya: ["Pop", "Indie Pop", "Dance-pop", "K-pop", "Electropop"],
};

const CONTEXTS = ["commute", "late night", "rainy day", "focus", "workout", "road trip", "sunday morning"];
const REVIEWS = [
  "Grew on me with every listen.",
  "The back half is where it really opens up.",
  "Front to back, no skips.",
  "Production is gorgeous, a couple of songs drag.",
  "Instantly one of my favourites this year.",
  "Not my thing at first, but the hooks won me over.",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

async function seedUser(username: string, genres: string[], year: number) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.log(`skip ${username}: not found (run npm run db:seed first)`);
    return;
  }
  const rand = mulberry32(hash(`${username}:${year}`));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const preferred = await prisma.album.findMany({
    where: { releaseGroupType: "Album", genres: { some: { genre: { name: { in: genres } } } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const other = await prisma.album.findMany({
    where: { releaseGroupType: "Album", id: { notIn: preferred.map((a) => a.id) } },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 300,
  });
  if (preferred.length === 0) {
    console.log(`skip ${username}: no albums in ${genres.join(", ")}`);
    return;
  }

  // A rotation of ~45 albums, mostly from the user's genres; earlier entries come up more.
  const rotation: string[] = [];
  while (rotation.length < 45) {
    const id = rand() < 0.8 ? pick(preferred).id : pick(other).id;
    if (!rotation.includes(id)) rotation.push(id);
  }
  const quality = new Map(rotation.map((id) => [id, 3 + Math.floor(rand() * 5) * 0.5]));

  const tagRows = await Promise.all(
    CONTEXTS.map((name) => prisma.contextTag.upsert({ where: { name }, update: {}, create: { name } }))
  );

  const seen = new Set<string>();
  let n = 0;
  let active = false;
  const end = Date.UTC(year + 1, 0, 1);
  for (let t = Date.UTC(year, 0, 1); t < end; t += 86400000) {
    // Sticky on/off days produce realistic streaks and quiet spells.
    active = active ? rand() < 0.75 : rand() < 0.35;
    if (!active) continue;

    const listensToday = rand() < 0.3 ? 2 : 1;
    for (let k = 0; k < listensToday; k++) {
      const albumId = rotation[Math.floor(Math.pow(rand(), 1.8) * rotation.length)];
      const first = !seen.has(albumId);
      seen.add(albumId);

      const rated = first ? rand() < 0.8 : rand() < 0.25;
      const base = quality.get(albumId)!;
      const rating = rated ? Math.min(5, Math.max(0.5, base + (rand() < 0.3 ? -0.5 : 0))) : null;
      const listenedAt = new Date(t + (9 + Math.floor(rand() * 13)) * 3600000);

      const log = await prisma.log.create({
        data: {
          userId: user.id,
          albumId,
          rating,
          reviewText: first && rand() < 0.15 ? pick(REVIEWS) : null,
          listenedAt,
          createdAt: listenedAt,
          isRelisten: !first,
          importKey: `seed-yir:${username}:${year}:${n++}`,
        },
      });
      if (rand() < 0.25) {
        await prisma.logContextTag.create({ data: { logId: log.id, tagId: pick(tagRows).id } });
      }
    }
  }

  await invalidateYearStats(user.id, [year]);
  console.log(`${username}: seeded ${n} listens across ${seen.size} albums in ${year}`);
}

async function main() {
  const year = process.argv[2] ? Number(process.argv[2]) : 2025;
  if (!Number.isInteger(year)) throw new Error(`Not a year: ${process.argv[2]}`);

  const removed = await prisma.log.deleteMany({
    where: { importKey: { startsWith: `seed-yir:` }, listenedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
  });
  if (removed.count) console.log(`removed ${removed.count} previously seeded listens for ${year}`);

  for (const [username, genres] of Object.entries(PROFILES)) {
    await seedUser(username, genres, year);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
