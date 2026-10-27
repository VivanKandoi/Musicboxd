import Link from "next/link";
import Image from "next/image";
import type { Recommendation } from "@/lib/recommendations";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Link href={`/album/${recommendation.id}`} className="group w-32 shrink-0 sm:w-36">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border transition-[box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/30 group-hover:ring-accent">
        {recommendation.coverUrl && (
          <Image
            src={recommendation.coverUrl}
            alt={recommendation.title}
            fill
            sizes="144px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-foreground">
        {recommendation.title}
      </p>
      <p className="truncate text-xs text-muted">{recommendation.artist}</p>
      {recommendation.reasons[0] && (
        <span className="mt-1 inline-block truncate rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
          {recommendation.reasons[0]}
        </span>
      )}
    </Link>
  );
}
