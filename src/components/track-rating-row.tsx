"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/star-rating";

export function TrackRatingRow({
  trackId,
  title,
  trackNumber,
  duration,
  initialAvg,
  initialCount,
  initialMyRating,
  isAuthenticated,
}: {
  trackId: string;
  title: string;
  trackNumber: number;
  duration: string;
  initialAvg: number | null;
  initialCount: number;
  initialMyRating: number | null;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [myRating, setMyRating] = useState(initialMyRating);
  const [pending, setPending] = useState(false);

  async function submit(rating: number | null) {
    if (!isAuthenticated || pending) return;
    setPending(true);
    const res = await fetch(`/api/tracks/${trackId}/rating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setPending(false);
    if (res.ok) {
      const data = await res.json();
      setMyRating(data.rating);
      setAvg(data.avgRating);
      setCount(data.ratingCount);
      router.refresh();
    }
  }

  return (
    <li className="flex flex-col gap-1 border-b border-border py-2 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <span className="text-foreground">
          <span className="mr-2 text-muted">{trackNumber}.</span>
          {title}
        </span>
        <span className="text-muted sm:hidden">{duration}</span>
      </div>
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <StarRating value={myRating} onChange={submit} size="sm" />
            {myRating != null && (
              <button
                type="button"
                onClick={() => submit(null)}
                disabled={pending}
                className="text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                clear
              </button>
            )}
          </>
        ) : (
          <StarRating value={avg} readOnly size="sm" />
        )}
        {count > 0 && (
          <span className="text-xs text-muted">
            {avg?.toFixed(1)} ({count})
          </span>
        )}
        <span className="hidden text-muted sm:inline">{duration}</span>
      </div>
    </li>
  );
}
