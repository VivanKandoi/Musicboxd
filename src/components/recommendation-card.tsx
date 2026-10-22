import Link from "next/link";
import Image from "next/image";
import type { Recommendation } from "@/lib/recommendations";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Link href={`/album/${recommendation.id}`} className="w-36 shrink-0 group">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border group-hover:ring-accent">
        {recommendation.coverUrl && (
          <Image
            src={recommendation.coverUrl}
            alt={recommendation.title}
            fill
            sizes="144px"
            className="object-cover"
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
