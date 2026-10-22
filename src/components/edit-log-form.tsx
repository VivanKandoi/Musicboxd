"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Repeat } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { TagInput } from "@/components/tag-input";

export function EditLogForm({
  logId,
  initialRating,
  initialReviewText,
  initialListenedAt,
  initialIsRelisten,
  initialTags,
  onCancel,
  onSaved,
}: {
  logId: string;
  initialRating: number | null;
  initialReviewText: string | null;
  initialListenedAt: string | Date;
  initialIsRelisten: boolean;
  initialTags?: string[];
  onCancel: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [reviewText, setReviewText] = useState(initialReviewText ?? "");
  const [listenedAt, setListenedAt] = useState(() =>
    new Date(initialListenedAt).toISOString().slice(0, 10)
  );
  const [isRelisten, setIsRelisten] = useState(initialIsRelisten);
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch(`/api/logs/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        reviewText: reviewText || null,
        listenedAt: new Date(listenedAt).toISOString(),
        isRelisten,
        tags,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }
    onSaved?.();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Edit log</h3>
        <button
          type="button"
          onClick={onCancel}
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Personal Review</span>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write a review (optional)…"
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <TagInput tags={tags} onChange={setTags} />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          <Calendar size={14} />
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
            className="accent-accent"
          />
          <Repeat size={14} />
          This is a relisten
        </label>
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
