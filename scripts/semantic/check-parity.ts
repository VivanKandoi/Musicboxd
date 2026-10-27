// Checks that the app's Semantic Discovery engine (transformers.js MiniLM + the scoring in
// src/lib/semantic-search.ts) reproduces the research pipeline's rankings, using the
// reference top-10 lists from the paper's seven-model comparison.
//   npm run semantic:parity -- "Model Data and Code/MERGE_Bimodal_Complete/MERGE_Bimodal_Complete"
import { readFileSync } from "node:fs";
import { cosineAll, fuse, zScores } from "../../src/lib/semantic-search";
import { embedText } from "../../src/lib/text-embedder";

const BUNDLE = "prisma/data/semantic";

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...rest] = rows;
  return rest.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function matrix(file: string, rows: number, dim: number) {
  const buf = readFileSync(`${BUNDLE}/${file}`);
  return { dim, data: new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)), present: new Uint8Array(rows).fill(1) };
}

async function main() {
  const dataDir = process.argv[2];
  if (!dataDir) throw new Error("Pass the research data folder (see the comment at the top of this file).");
  const ref = parseCsv(readFileSync(`${dataDir}/seven_model_comparison/seven_model_retrieval_30_queries_top10.csv`, "utf8"));
  const { songs } = JSON.parse(readFileSync(`${BUNDLE}/songs.json`, "utf8")) as { songs: { id: string }[] };
  const ids = songs.map((s) => s.id);
  const L = matrix("lyrics.f32", ids.length, 384);
  const R = matrix("reviews.f32", ids.length, 384);

  const systems = { "Lyrics-only": ["L"], "Reviews-only": ["R"], "Lyrics + Reviews": ["L", "R"] } as const;
  const stats = Object.fromEntries(Object.keys(systems).map((s) => [s, { exact: 0, sameSet: 0, total: 0 }]));
  let maxCosDiff = 0;
  let maxZDiff = 0;
  let maxTieGap = 0;

  const queries = [...new Map(ref.map((r) => [r.Query_Number, r.Query])).entries()];
  for (const [qn, query] of queries) {
    const q = await embedText(query);
    const cos = { L: cosineAll(q, L), R: cosineAll(q, R) };
    const z = { L: zScores(cos.L), R: zScores(cos.R) };

    for (const [name, spaces] of Object.entries(systems)) {
      const refRows = ref.filter((r) => r.Query_Number === qn && r.Model === name).sort((a, b) => +a.Rank - +b.Rank);
      if (refRows.length === 0) continue;
      const score = spaces.length === 1 ? z[spaces[0]] : fuse(spaces.map((s) => z[s]));
      const top = [...score.keys()].sort((a, b) => score[b] - score[a]).slice(0, refRows.length);
      const ours = top.map((i) => ids[i]);
      const theirs = refRows.map((r) => r.AllMusic_ID);
      const s = stats[name];
      s.total += 1;
      if (ours.join() === theirs.join()) s.exact += 1;
      if ([...ours].sort().join() === [...theirs].sort().join()) s.sameSet += 1;
      ours.forEach((id, k) => {
        if (id !== theirs[k]) maxTieGap = Math.max(maxTieGap, Math.abs(score[top[k]] - score[ids.indexOf(theirs[k])]));
      });
      for (const r of refRows) {
        const i = ids.indexOf(r.AllMusic_ID);
        if (r.cos_lyrics) maxCosDiff = Math.max(maxCosDiff, Math.abs(cos.L[i] - +r.cos_lyrics));
        if (r.cos_reviews) maxCosDiff = Math.max(maxCosDiff, Math.abs(cos.R[i] - +r.cos_reviews));
        maxZDiff = Math.max(maxZDiff, Math.abs(score[i] - +r.Score));
      }
    }
  }

  console.log(`Queries: ${queries.length} (30-query benchmark), catalogue: ${ids.length} songs\n`);
  console.log(`${"system".padEnd(18)}identical order   same songs`);
  for (const [name, s] of Object.entries(stats)) {
    console.log(`${name.padEnd(18)}${`${s.exact}/${s.total}`.padStart(15)}${`${s.sameSet}/${s.total}`.padStart(13)}`);
  }
  console.log(`\nmax |cosine − Python|:      ${maxCosDiff.toExponential(2)}`);
  console.log(`max |fused z − Python|:     ${maxZDiff.toExponential(2)}`);
  console.log(
    `largest score gap at a swapped rank: ${maxTieGap.toExponential(2)}` +
      (maxTieGap < 1e-5 ? " — every difference is a tie (songs with equal scores, e.g. duplicate lyrics)" : "")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
