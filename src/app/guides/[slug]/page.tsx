import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGuide, getGuidePicks } from "@/lib/guides";
import { StarRating } from "@/components/star-rating";

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const picks = await getGuidePicks(guide);

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/guides" className="hover:text-foreground">
          Start Here Guides
        </Link>
        <span>/</span>
        <span>{guide.title}</span>
      </div>

      <div
        className="rounded-xl p-6 sm:p-8"
        style={{ backgroundImage: `linear-gradient(135deg, ${guide.gradient})` }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">
          {guide.kind === "era" ? "Era deep dive" : "Genre deep dive"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{guide.title}</h1>
        <p className="mt-1 text-sm text-white/90">{guide.tagline}</p>
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/90">{guide.intro}</p>

      <h2 className="mb-3 mt-8 text-lg font-medium">
        {picks.some((p) => p.ratingCount > 0) ? "Community favorites" : "Albums to start with"}
      </h2>
      {picks.length === 0 ? (
        <p className="text-sm text-muted">
          No matching albums in the catalog yet — check back as more get imported.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {picks.map((album) => (
            <Link key={album.id} href={`/album/${album.id}`} className="group">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border group-hover:ring-accent">
                {album.coverUrl && (
                  <Image
                    src={album.coverUrl}
                    alt={album.title}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                )}
              </div>
              <p className="mt-1.5 truncate text-sm font-medium text-foreground">{album.title}</p>
              <p className="truncate text-xs text-muted">
                {album.artist}
                {album.year && ` · ${album.year}`}
              </p>
              {album.avgRating != null && (
                <div className="mt-0.5 flex items-center gap-1">
                  <StarRating value={album.avgRating} readOnly size="sm" />
                  <span className="text-[11px] text-muted">({album.ratingCount})</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
