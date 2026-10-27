import Link from "next/link";
import Image from "next/image";
import { CalendarClock } from "lucide-react";
import { StarRating } from "@/components/star-rating";

type OnThisDayLog = {
  id: string;
  rating: number | null;
  reviewText: string | null;
  listenedAt: Date;
  album: { id: string; title: string; coverUrl: string | null; artist: { name: string } };
};

function yearsAgo(date: Date) {
  const years = new Date().getFullYear() - new Date(date).getFullYear();
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function OnThisDay({ logs }: { logs: OnThisDayLog[] }) {
  return (
    <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarClock size={15} className="text-accent" />
        On this day
      </h2>
      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <Link
            key={log.id}
            href={`/album/${log.album.id}`}
            className="flex items-center gap-3 rounded-lg bg-background/40 p-2 hover:bg-background/70"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
              {log.album.coverUrl && (
                <Image
                  src={log.album.coverUrl}
                  alt={log.album.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                You logged <span className="font-medium">{log.album.title}</span>{" "}
                <span className="text-muted">{yearsAgo(log.listenedAt)}</span>
              </p>
              {log.rating != null && <StarRating value={log.rating} readOnly size="sm" />}
              {log.reviewText && (
                <p className="mt-0.5 truncate text-xs italic text-muted">
                  &ldquo;{log.reviewText}&rdquo;
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
