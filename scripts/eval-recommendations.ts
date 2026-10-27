// Offline evaluation of "You'll also enjoy" (Tier 3 plan, evaluation table):
// Hit rate@10 and NDCG@10 on held-out listens, against two baselines —
// popularity ranking and association-rule mining.
//
// Split: for each user, their distinct albums are ordered by first listen; the latest 20%
// (2–10 albums) are held out and everything listened to before the first held-out album is
// training data. Other users' full histories are available, as in production.
//
//   npm run eval:recs                   -> held-out manual + imported listens
//   npm run eval:recs -- --source=lastfm  -> held-out Last.fm listens only (the plan's metric)
import { prisma } from "../src/lib/prisma";
import {
  loadCatalogIndex,
  lovedAlbumIds,
  recommend,
  type ListenSignal,
} from "../src/lib/recommendations";

const K = 10;
const MIN_ALBUMS = 10;

type Listen = ListenSignal & { listenedAt: Date; undated: boolean };

function ndcgAtK(ranked: string[], relevant: Set<string>) {
  let dcg = 0;
  ranked.slice(0, K).forEach((id, i) => {
    if (relevant.has(id)) dcg += 1 / Math.log2(i + 2);
  });
  let idcg = 0;
  for (let i = 0; i < Math.min(K, relevant.size); i++) idcg += 1 / Math.log2(i + 2);
  return idcg === 0 ? 0 : dcg / idcg;
}

function metrics(ranked: string[], relevant: Set<string>) {
  const top = ranked.slice(0, K);
  const hits = top.filter((id) => relevant.has(id)).length;
  return { hit: hits > 0 ? 1 : 0, ndcg: ndcgAtK(ranked, relevant), recall: hits / relevant.size };
}

function popularityRank(others: Map<string, Set<string>>, exclude: Set<string>) {
  const counts = new Map<string, number>();
  for (const albums of others.values()) for (const id of albums) counts.set(id, (counts.get(id) ?? 0) + 1);
  return {
    counts,
    ranked: [...counts.entries()]
      .filter(([id]) => !exclude.has(id))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id),
  };
}

// Association rules A -> B over other users' album sets: confidence = |A∧B| / |A|,
// requiring support |A∧B| >= 2. A candidate's score is its best rule from the user's history.
function associationRank(
  others: Map<string, Set<string>>,
  history: Set<string>,
  popularity: Map<string, number>
) {
  const single = new Map<string, number>();
  const pair = new Map<string, number>();
  for (const albums of others.values()) {
    const relevantA = [...albums].filter((a) => history.has(a));
    for (const a of albums) single.set(a, (single.get(a) ?? 0) + 1);
    for (const a of relevantA) {
      for (const b of albums) if (a !== b) pair.set(`${a}|${b}`, (pair.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  const scores = new Map<string, number>();
  for (const [key, support] of pair) {
    if (support < 2) continue;
    const [a, b] = key.split("|");
    if (history.has(b)) continue;
    const confidence = support / single.get(a)!;
    scores.set(b, Math.max(scores.get(b) ?? 0, confidence));
  }
  return [...scores.entries()]
    .sort((x, y) => y[1] - x[1] || (popularity.get(y[0]) ?? 0) - (popularity.get(x[0]) ?? 0))
    .map(([id]) => id);
}

async function main() {
  const lastfmOnly = process.argv.includes("--source=lastfm");
  const [listens, catalog] = await Promise.all([
    prisma.log.findMany({
      select: { userId: true, albumId: true, rating: true, source: true, playCount: true, listenedAt: true, undated: true },
    }),
    loadCatalogIndex(),
  ]);

  const byUser = new Map<string, Listen[]>();
  for (const l of listens) byUser.set(l.userId, [...(byUser.get(l.userId) ?? []), l]);

  const totals = {
    ours: { hit: 0, ndcg: 0, recall: 0 },
    popularity: { hit: 0, ndcg: 0, recall: 0 },
    association: { hit: 0, ndcg: 0, recall: 0 },
  };
  let evaluated = 0;
  let skipped = 0;

  for (const [userId, userListens] of byUser) {
    const dated = userListens.filter((l) => !l.undated).sort((a, b) => a.listenedAt.getTime() - b.listenedAt.getTime());
    const firstListen = new Map<string, Listen>();
    for (const l of dated) if (!firstListen.has(l.albumId)) firstListen.set(l.albumId, l);
    const order = [...firstListen.values()];
    if (order.length < MIN_ALBUMS) {
      skipped += 1;
      continue;
    }

    const holdout = Math.min(10, Math.max(2, Math.round(order.length * 0.2)));
    const testFirst = order.slice(-holdout);
    const cutoff = testFirst[0].listenedAt.getTime();
    const test = new Set(
      testFirst.filter((l) => !lastfmOnly || l.source === "lastfm").map((l) => l.albumId)
    );
    if (test.size === 0) {
      skipped += 1;
      continue;
    }
    const train = userListens.filter(
      (l) => !test.has(l.albumId) && (l.undated || l.listenedAt.getTime() < cutoff)
    );
    const history = new Set(train.map((l) => l.albumId));

    const othersLoved = new Map<string, Set<string>>();
    const othersLogged = new Map<string, Set<string>>();
    for (const [otherId, theirs] of byUser) {
      if (otherId === userId) continue;
      othersLoved.set(otherId, lovedAlbumIds(theirs));
      othersLogged.set(otherId, new Set(theirs.map((l) => l.albumId)));
    }

    const pop = popularityRank(othersLogged, history);
    const ours = recommend(train, othersLoved, catalog, K, pop.counts).map((r) => r.id);
    const assoc = associationRank(othersLogged, history, pop.counts);

    for (const [name, ranked] of [
      ["ours", ours],
      ["popularity", pop.ranked],
      ["association", assoc],
    ] as const) {
      const m = metrics(ranked, test);
      totals[name].hit += m.hit;
      totals[name].ndcg += m.ndcg;
      totals[name].recall += m.recall;
    }
    evaluated += 1;
  }

  console.log(
    `Users evaluated: ${evaluated} (skipped ${skipped} with fewer than ${MIN_ALBUMS} dated albums${
      lastfmOnly ? " or no held-out Last.fm listens" : ""
    })`
  );
  if (evaluated === 0) return;
  console.log(`\n${"method".padEnd(28)}HitRate@${K}  NDCG@${K}  Recall@${K}`);
  const labels = {
    ours: "You'll also enjoy (ours)",
    popularity: "Popularity baseline",
    association: "Association rules baseline",
  };
  for (const [name, t] of Object.entries(totals)) {
    console.log(
      `${labels[name as keyof typeof labels].padEnd(28)}${(t.hit / evaluated).toFixed(3).padStart(10)}${(t.ndcg / evaluated).toFixed(3).padStart(9)}${(t.recall / evaluated).toFixed(3).padStart(11)}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
