import type { Badge } from "@/lib/badges";
import { Award } from "lucide-react";

export function BadgesSection({ badges }: { badges: Badge[] }) {
  const achieved = badges.filter((b) => b.achieved);
  const inProgress = badges.filter((b) => !b.achieved).slice(0, 3);
  const shown = [...achieved, ...inProgress];
  if (shown.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Badges</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((b) => (
          <div
            key={b.id}
            className={`rounded-xl border p-3 ${
              b.achieved
                ? "border-accent/40 bg-accent/5"
                : "border-border bg-surface opacity-70"
            }`}
            title={b.description}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <Award size={15} className={b.achieved ? "text-accent" : "text-muted"} />
              <p className="text-sm font-medium text-foreground">{b.label}</p>
            </div>
            <p className="mb-2 text-xs text-muted">{b.description}</p>
            {!b.achieved && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(b.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
