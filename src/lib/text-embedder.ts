import path from "node:path";

// Query encoder for Semantic Discovery: the same all-MiniLM-L6-v2 used to embed lyrics and
// reviews in the research (sentence-transformers, mean pooling, L2-normalised). Runs in
// Node via transformers.js (ONNX); fp32 reproduces the Python vectors to ~1e-7.
// The model (~90 MB) downloads from Hugging Face on first use into .cache/transformers;
// run `npm run semantic:warm` before an offline demo.
export const TEXT_MODEL = "Xenova/all-MiniLM-L6-v2";

type Extractor = (text: string, options: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>;

let extractor: Promise<Extractor> | null = null;
const recent = new Map<string, Float32Array>();
const MAX_CACHED = 200;

function loadExtractor() {
  extractor ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = path.join(process.cwd(), ".cache", "transformers");
    return (await pipeline("feature-extraction", TEXT_MODEL, { dtype: "fp32" })) as unknown as Extractor;
  })().catch((err) => {
    extractor = null; // let the next request retry (e.g. after a network blip)
    throw err;
  });
  return extractor;
}

export async function embedText(text: string): Promise<Float32Array> {
  const key = text.trim();
  const cached = recent.get(key);
  if (cached) return cached;

  const out = await (await loadExtractor())(key, { pooling: "mean", normalize: true });
  const vector = Float32Array.from(out.data);
  recent.set(key, vector);
  if (recent.size > MAX_CACHED) recent.delete(recent.keys().next().value!);
  return vector;
}
