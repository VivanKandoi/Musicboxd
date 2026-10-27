import Link from "next/link";
import Image from "next/image";
import Form from "next/form";
import { Sparkles, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { applyCustomCovers } from "@/lib/entitlements";
import { BENCHMARK_QUERIES } from "@/lib/semantic-queries";
import { QUADRANTS, SYSTEMS, semanticCatalogSize, semanticSearch, type Quadrant, type SystemId } from "@/lib/semantic-search";
import { loadSemanticTracks } from "@/lib/semantic-tracks";
import { AccentAurora, AccentShinyText } from "@/components/fx";

const DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010];
const pct = (p: number) => `top ${Math.max(1, Math.round((1 - p) * 100))}%`;

function first<T extends string>(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) as T | undefined;
}

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 300);
  const system: SystemId = first(params.mode) === "lyrics+reviews" ? "lyrics+reviews" : "lyrics";
  const moodParam = first<Quadrant>(params.mood);
  const mood = moodParam && moodParam in QUADRANTS ? moodParam : null;
  const decadeParam = Number(first(params.decade));
  const decade = DECADES.includes(decadeParam) ? decadeParam : null;

  const [session, catalogSize] = await Promise.all([auth(), semanticCatalogSize()]);
  const hits = query
    ? await semanticSearch(query, { system, limit: 20, quadrants: mood ? [mood] : [], decade })
    : [];
  const tracks = await loadSemanticTracks(hits.map((h) => h.trackId));
  await applyCustomCovers(session?.user?.id, tracks, (t) => t.album);
  const hitById = new Map(hits.map((h) => [h.trackId, h]));

  const explainQuery = new URLSearchParams({ q: query, mode: system }).toString();
  const suggestions = BENCHMARK_QUERIES.filter((q, i) => q.surveyed || i % 5 === 2).slice(0, 8);

  return (
    <div>
      <div className="relative isolate pb-6 pt-2">
        <AccentAurora
          opacity={0.45}
          className="absolute -inset-x-4 -top-6 h-64 -z-10 sm:-inset-x-6"
        />
        <h1 className="text-2xl font-semibold sm:text-3xl">
          <AccentShinyText text="Semantic Music Discovery" />
        </h1>
        <p className="text-sm text-muted">
          Describe a feeling, a situation or a story. We match it against what {catalogSize.toLocaleString()} songs are
          actually about.
        </p>
      </div>

      {catalogSize === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          The semantic catalogue hasn&rsquo;t been imported yet. Run <code>npm run semantic:import</code>.
        </p>
      ) : (
        <Form action="/discover" className="rounded-xl border border-accent/50 bg-surface/80 p-4 shadow-lg shadow-black/10 backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-background px-3 py-2.5">
            <Sparkles size={16} className="shrink-0 text-accent" />
            <input
              name="q"
              defaultValue={query}
              placeholder="a song about growing older and changing"
              aria-label="Describe the music you want"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90"
            >
              Search
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterSelect name="mode" label="Match on" value={system} options={Object.entries(SYSTEMS).map(([id, s]) => [id, s.label])} />
            <FilterSelect name="mood" label="Mood" value={mood ?? ""} options={[["", "Any"], ...Object.entries(QUADRANTS)]} />
            <FilterSelect name="decade" label="Decade" value={decade?.toString() ?? ""} options={[["", "Any"], ...DECADES.map((d) => [String(d), `${d}s`])]} />
          </div>

          {!query && (
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Link
                  key={s.query}
                  href={`/discover?${new URLSearchParams({ q: s.query })}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground"
                >
                  {s.query}
                </Link>
              ))}
            </div>
          )}
        </Form>
      )}

      {query && (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium">Best matches</h2>
            <p className="text-xs text-muted">
              Matched on {SYSTEMS[system].label.toLowerCase()} · ranked by z-scored cosine similarity
            </p>
          </div>
          {tracks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No songs match those filters. Try a different mood or decade.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {tracks.map((t, i) => {
                const hit = hitById.get(t.id)!;
                const chips = [...(t.tags.themes ?? []).slice(0, 2), ...(t.tags.moods ?? []).slice(0, 2)];
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <span className="w-5 shrink-0 text-center text-sm text-muted">{i + 1}</span>
                    <Link href={`/album/${t.album.id}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                      {t.album.coverUrl && <Image src={t.album.coverUrl} alt={t.album.title} fill sizes="48px" className="object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/discover/song/${t.id}?${explainQuery}`} className="block truncate text-sm font-medium text-foreground hover:text-accent">
                        {t.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        <Link href={`/artist/${t.album.artist.id}`} className="hover:text-foreground">
                          {t.album.artist.name}
                        </Link>
                        {" · "}
                        <Link href={`/album/${t.album.id}`} className="hover:text-foreground">
                          {t.album.title}
                        </Link>
                        {t.tags.year ? ` · ${t.tags.year}` : ""}
                      </p>
                      {chips.length > 0 && (
                        <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
                          {chips.map((c) => (
                            <span key={c} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href={`/discover/song/${t.id}?${explainQuery}`} className="shrink-0 text-right" title="Why this match?">
                      <span className="block text-xs font-semibold text-success">
                        {hit.lyrics ? `Lyrics ${pct(hit.lyrics.percentile)}` : ""}
                      </span>
                      {system === "lyrics+reviews" && hit.reviews && (
                        <span className="block text-[10px] text-muted">Reviews {pct(hit.reviews.percentile)}</span>
                      )}
                      <span className="block text-[10px] text-accent">Why? →</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      <Link href="/guides" className="mt-6 flex items-center gap-1 text-sm text-accent hover:underline">
        Want to discover new genres? Explore our genre guides
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: (readonly [string, string] | string[])[];
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
      {label}:
      <select name={name} defaultValue={value} className="bg-transparent text-foreground focus:outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-surface text-foreground">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
