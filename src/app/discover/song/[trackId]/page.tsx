import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Sparkles, AudioLines, BookText, MessageSquareQuote } from "lucide-react";
import { auth } from "@/lib/auth";
import { applyCustomCovers } from "@/lib/entitlements";
import { QUADRANTS, SYSTEMS, explainMatch, similarTracks, type ModalityScore, type Quadrant, type SystemId } from "@/lib/semantic-search";
import { loadSemanticTracks } from "@/lib/semantic-tracks";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const topPct = (p: number) => Math.max(1, Math.round((1 - p) * 100));

export default async function SongExplanationPage({ params, searchParams }: PageProps<"/discover/song/[trackId]">) {
  const { trackId } = await params;
  const sp = await searchParams;
  const query = (first(sp.q) ?? "").trim().slice(0, 300);
  const system: SystemId = first(sp.mode) === "lyrics+reviews" ? "lyrics+reviews" : "lyrics";

  const [track] = await loadSemanticTracks([trackId]);
  if (!track) notFound();

  const session = await auth();
  const [match, byLyrics, bySound] = await Promise.all([
    query ? explainMatch(query, trackId, system) : null,
    similarTracks(trackId, "lyrics", 5),
    similarTracks(trackId, "audio", 5),
  ]);
  const related = await loadSemanticTracks([...byLyrics, ...bySound].map((s) => s.trackId));
  await applyCustomCovers(session?.user?.id, [track, ...related], (t) => t.album);
  const relatedById = new Map(related.map((t) => [t.id, t]));

  const mood = track.quadrant ? QUADRANTS[track.quadrant as Quadrant] : null;
  const backHref = query ? `/discover?${new URLSearchParams({ q: query, mode: system })}` : "/discover";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Link href={backHref} className="hover:text-foreground">
          {query ? "Discovery results" : "Semantic Discovery"}
        </Link>
        <span>/</span>
        <span className="truncate">{track.title}</span>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <Link href={`/album/${track.album.id}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border">
          {track.album.coverUrl && <Image src={track.album.coverUrl} alt={track.album.title} fill sizes="112px" className="object-cover" />}
        </Link>
        <div className="min-w-0">
          {match && (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
              #{match.rank} of {match.catalogueSize.toLocaleString()} for this search
            </span>
          )}
          <h1 className="mt-2 text-2xl font-semibold">{track.title}</h1>
          <p className="text-sm text-muted">
            <Link href={`/artist/${track.album.artist.id}`} className="hover:text-accent">
              {track.album.artist.name}
            </Link>
            {" · "}
            <Link href={`/album/${track.album.id}`} className="hover:text-accent">
              {track.album.title}
            </Link>
            {track.tags.year ? ` · ${track.tags.year}` : ""}
          </p>
          <Link
            href={`/album/${track.album.id}?log=1`}
            className="mt-3 inline-flex rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Log this album
          </Link>
        </div>
      </section>

      {query && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Sparkles size={15} className="text-accent" />
            Why it matched &ldquo;{query}&rdquo;
          </h2>
          <p className="mb-4 text-xs text-muted">
            Each signal compares your words with the song using all-MiniLM-L6-v2 sentence embeddings, scored against the
            whole catalogue. Ranking used: {SYSTEMS[system].label.toLowerCase()}.
          </p>
          {match ? (
            <div className="flex flex-col gap-4">
              <SignalBar icon={<BookText size={14} />} label="What the lyrics are about" score={match.lyrics} used={SYSTEMS[system].spaces.includes("lyrics")} />
              <SignalBar
                icon={<MessageSquareQuote size={14} />}
                label="What listeners say about it"
                score={match.reviews}
                used={SYSTEMS[system].spaces.includes("reviews")}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">This song isn&rsquo;t in the searchable catalogue.</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-medium">About this song</h2>
        <div className="flex flex-col gap-2 text-sm">
          {mood && (
            <p>
              <span className="text-muted">Mood quadrant:</span> {mood}
            </p>
          )}
          <TagRow label="Themes" tags={track.tags.themes} />
          <TagRow label="Moods" tags={track.tags.moods} />
          <TagRow label="Style" tags={track.tags.styles?.length ? track.tags.styles : track.tags.genres} />
          <p className="text-[11px] text-muted">Mood and theme tags from AllMusic via the MERGE dataset.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RelatedList
          icon={<BookText size={14} className="text-accent" />}
          title="Songs about similar things"
          items={byLyrics.flatMap((s) => (relatedById.has(s.trackId) ? [relatedById.get(s.trackId)!] : []))}
        />
        <RelatedList
          icon={<AudioLines size={14} className="text-accent" />}
          title="Songs that sound similar"
          note="By LAION-CLAP audio embeddings"
          items={bySound.flatMap((s) => (relatedById.has(s.trackId) ? [relatedById.get(s.trackId)!] : []))}
        />
      </div>
    </div>
  );
}

function SignalBar({ icon, label, score, used }: { icon: React.ReactNode; label: string; score: ModalityScore | null; used: boolean }) {
  if (!score) return null;
  const width = Math.round(score.percentile * 100);
  return (
    <div className={used ? "" : "opacity-60"}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          {icon}
          {label}
          {!used && <span className="font-normal text-muted">(not used for ranking)</span>}
        </span>
        <span className="text-xs text-muted">
          top {topPct(score.percentile)}% · cosine {score.cosine.toFixed(2)} · z {score.z.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted">{label}:</span>
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}

type RelatedTrack = Awaited<ReturnType<typeof loadSemanticTracks>>[number];

function RelatedList({ icon, title, note, items }: { icon: React.ReactNode; title: string; note?: string; items: RelatedTrack[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </h2>
      {note && <p className="mb-2 text-[11px] text-muted">{note}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/discover/song/${t.id}`} className="flex items-center gap-2 text-sm hover:text-accent">
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
                {t.album.coverUrl && <Image src={t.album.coverUrl} alt="" fill sizes="36px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-foreground">{t.title}</span>
                <span className="block truncate text-xs text-muted">{t.album.artist.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
