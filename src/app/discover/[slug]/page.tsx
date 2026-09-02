import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Play, Plus, Share2, ListChecks } from "lucide-react";
import { DEMO_DISCOVER_RESULTS } from "@/lib/demo-discover-data";

export default async function DiscoverExplanationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = DEMO_DISCOVER_RESULTS.find((r) => r.slug === slug);
  if (!result) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/discover" className="hover:text-foreground">
          Discovery Results
        </Link>
        <span>/</span>
        <span>{result.title} explanation</span>
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted">
        <span className="rounded-full border border-border px-2 py-0.5">Preview</span>
        <span>Static demo — no ML model wired up yet</span>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="h-28 w-28 shrink-0 rounded-xl"
            style={{ backgroundImage: `linear-gradient(135deg, ${result.gradient})` }}
          />
          <div className="flex-1">
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
              {result.match}% MATCH CONFIDENCE
            </span>
            <h1 className="mt-2 text-2xl font-semibold">{result.title}</h1>
            <p className="text-sm text-muted">
              {result.artist} · Album: {result.album} ({result.year})
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground opacity-70"
                title="Playback not available in this preview"
              >
                <Play size={14} />
                Play Track
              </button>
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-muted opacity-70"
                title="Not part of the real catalog"
              >
                <Plus size={14} />
                Log to Journal
              </button>
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-muted opacity-70"
                title="Not part of the real catalog"
              >
                <Share2 size={14} />
                Share with Community
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
            <ListChecks size={15} className="text-accent" />
            Semantic Feature Contribution
          </h2>
          <div className="flex flex-col gap-4">
            <FeatureBar label="Audio Profile" sub={result.audioProfile.label} value={result.audioProfile.value} />
            <FeatureBar label="Lyric Relevance" sub={result.lyricRelevance.label} value={result.lyricRelevance.value} />
            <FeatureBar
              label="Listener Reviews Sentiment"
              sub={result.reviewSentiment.label}
              value={result.reviewSentiment.value}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium">Extracted Semantic Themes</h2>
            <div className="flex flex-wrap gap-2">
              {result.themes.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium">Review Sentiment Influences</h2>
            <div className="flex flex-col gap-3">
              {result.reviewInfluences.map((r) => (
                <div key={r.name} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium uppercase text-accent">
                    {r.name.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted">&ldquo;{r.quote}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles size={15} className="text-accent" />
          AI Recommendation Summary
        </h2>
        <p className="text-sm text-foreground/90">{result.summary}</p>
      </div>
    </div>
  );
}

function FeatureBar({ label, sub, value }: { label: string; sub: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">
          {label}{" "}
          <span className="font-normal text-muted">
            ({sub})
          </span>
        </span>
        <span className="text-xs text-muted">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
