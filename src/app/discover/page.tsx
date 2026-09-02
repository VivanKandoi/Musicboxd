"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Play, Heart, Bookmark } from "lucide-react";
import { DEMO_DISCOVER_RESULTS, DEMO_SUGGESTIONS } from "@/lib/demo-discover-data";

export default function DiscoverPage() {
  const [query, setQuery] = useState("Songs that feel nostalgic but hopeful");
  const [genre, setGenre] = useState("Any");
  const [decade, setDecade] = useState("1990s - 2020s");
  const [mood, setMood] = useState("Warm / Nostalgic");
  const [energy, setEnergy] = useState("Medium");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_DISCOVER_RESULTS;
    const scored = DEMO_DISCOVER_RESULTS.filter((r) =>
      r.tags.some((t) => q.includes(t)) ||
      r.title.toLowerCase().includes(q) ||
      q.split(/\s+/).some((w) => r.tags.includes(w))
    );
    return scored.length > 0 ? scored : DEMO_DISCOVER_RESULTS;
  }, [query]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full border border-border px-2 py-0.5">Preview</span>
        <span>Static demo — no ML model wired up yet</span>
      </div>
      <h1 className="text-2xl font-semibold sm:text-3xl">Semantic Music Discovery</h1>
      <p className="mb-6 text-sm text-muted">
        Unlock sonic landscapes described in your own words.
      </p>

      <div className="rounded-xl border border-accent/50 bg-surface p-4">
        <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-background px-3 py-2.5">
          <Sparkles size={16} className="shrink-0 text-accent" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Songs that feel nostalgic but hopeful"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterSelect label="Genre" value={genre} onChange={setGenre} options={["Any", "Pop", "Electronic", "Folk", "Rock"]} />
          <FilterSelect label="Decade" value={decade} onChange={setDecade} options={["1990s - 2020s", "2000s - 2010s", "2020s"]} />
          <FilterSelect label="Mood" value={mood} onChange={setMood} options={["Warm / Nostalgic", "Energetic", "Melancholy", "Calm"]} />
          <FilterSelect label="Energy" value={energy} onChange={setEnergy} options={["Low", "Medium", "High"]} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">Ranked Match Results</h2>
        <p className="text-xs text-muted">
          {results.length} matches found · Model semantic v2
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {results.map((r, i) => (
          <div
            key={r.slug}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3"
          >
            <span className="w-4 shrink-0 text-sm text-muted">{i + 1}</span>
            <div
              className="h-12 w-12 shrink-0 rounded-lg"
              style={{ backgroundImage: `linear-gradient(135deg, ${r.gradient})` }}
            />
            <Link href={`/discover/${r.slug}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground hover:text-accent">
                {r.title}
              </p>
              <p className="truncate text-xs text-muted">{r.artist}</p>
            </Link>
            <div className="hidden shrink-0 flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-success">{r.match}%</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">
                Semantic Match
              </span>
            </div>
            <div className="hidden gap-1.5 md:flex">
              {r.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1 text-muted">
              <button
                type="button"
                disabled
                className="flex h-7 w-7 items-center justify-center rounded-full text-accent opacity-60"
                title="Playback not available in this preview"
              >
                <Play size={14} />
              </button>
              <button
                type="button"
                disabled
                className="flex h-7 w-7 items-center justify-center rounded-full opacity-60"
              >
                <Heart size={14} />
              </button>
              <button
                type="button"
                disabled
                className="flex h-7 w-7 items-center justify-center rounded-full opacity-60"
              >
                <Bookmark size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/search"
        className="mt-6 flex items-center gap-1 text-sm text-accent hover:underline"
      >
        Looking for something specific? Search the real catalog
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-foreground">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
