import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export default function GuidesIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">Start Here Guides</h1>
      <p className="mb-6 text-sm text-muted">
        Curated deep dives into genres and eras, built from albums in the catalog.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div
              className="h-24"
              style={{ backgroundImage: `linear-gradient(135deg, ${guide.gradient})` }}
            />
            <div className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
                {guide.kind === "era" ? "Era" : "Genre"}
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground group-hover:text-accent">
                {guide.title}
              </h2>
              <p className="mt-1 text-xs text-muted">{guide.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
