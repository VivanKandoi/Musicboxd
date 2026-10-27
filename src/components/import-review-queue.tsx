"use client";

import { useState } from "react";

type Candidate = { albumId: string; title: string; artist: string; score: number };
type Item = {
  id: string;
  artistName: string;
  albumTitle: string;
  playCount: number;
  candidates: Candidate[];
};

export function ImportReviewQueue({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(itemId: string, albumId: string | null) {
    setPendingId(itemId);
    setError(null);
    const res = await fetch(`/api/import/review/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId }),
    });
    setPendingId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save that choice");
    }
  }

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-medium">Needs review ({items.length})</h2>
      <p className="mb-3 text-sm text-muted">
        These didn&rsquo;t match the catalog confidently. Pick the right album, or skip it.
      </p>
      {error && <p className="mb-2 text-xs text-accent">{error}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-foreground">
              <span className="font-medium">{item.albumTitle}</span>{" "}
              <span className="text-muted">by {item.artistName}</span>
            </p>
            <p className="mb-3 text-xs text-muted">
              {item.playCount} {item.playCount === 1 ? "play" : "plays"} on Last.fm
            </p>
            <div className="flex flex-wrap gap-2">
              {item.candidates.map((c) => (
                <button
                  key={c.albumId}
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => decide(item.id, c.albumId)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-foreground hover:border-accent disabled:opacity-50"
                >
                  {c.title} <span className="text-muted">· {c.artist} · {Math.round(c.score * 100)}%</span>
                </button>
              ))}
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => decide(item.id, null)}
                className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                None of these
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
