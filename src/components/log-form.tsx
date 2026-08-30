"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/star-rating";

export function LogForm({ albumId, hasLoggedBefore }: { albumId: string; hasLoggedBefore: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [listenedAt, setListenedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [isRelisten, setIsRelisten] = useState(hasLoggedBefore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId,
        rating,
        reviewText: reviewText || null,
        listenedAt: new Date(listenedAt).toISOString(),
        isRelisten,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    setRating(null);
    setReviewText("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        {hasLoggedBefore ? "Log another listen" : "Log this album"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Log this listen</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Rating</span>
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating != null && (
          <button
            type="button"
            onClick={() => setRating(null)}
            className="text-xs text-muted hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write a review (optional)…"
        rows={4}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          Listened on
          <input
            type="date"
            value={listenedAt}
            onChange={(e) => setListenedAt(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={isRelisten}
            onChange={(e) => setIsRelisten(e.target.checked)}
          />
          This is a relisten
        </label>
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save log"}
      </button>
    </form>
  );
}
