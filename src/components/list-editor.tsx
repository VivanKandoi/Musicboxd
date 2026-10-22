"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowDown, X } from "lucide-react";

type ListItem = {
  id: string;
  note: string | null;
  album: { id: string; title: string; coverUrl: string | null; artist: { name: string } };
};

export function ListEditor({
  listId,
  isOwner,
  initialItems,
}: {
  listId: string;
  isOwner: boolean;
  initialItems: ListItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);

  async function persistOrder(next: ListItem[]) {
    setPending(true);
    await fetch(`/api/lists/${listId}/items/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: next.map((i) => i.id) }),
    });
    setPending(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persistOrder(next);
  }

  async function removeItem(itemId: string) {
    const next = items.filter((i) => i.id !== itemId);
    setItems(next);
    await fetch(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        No albums in this list yet — add some from an album page.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
        >
          <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted">
            {index + 1}
          </span>
          <Link href={`/album/${item.album.id}`} className="shrink-0">
            <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
              {item.album.coverUrl && (
                <Image
                  src={item.album.coverUrl}
                  alt={item.album.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/album/${item.album.id}`}
              className="truncate text-sm font-medium text-foreground hover:text-accent"
            >
              {item.album.title}
            </Link>
            <p className="truncate text-xs text-muted">{item.album.artist.name}</p>
            {item.note && <p className="mt-1 text-xs text-foreground/80">{item.note}</p>}
          </div>
          {isOwner && (
            <div className="flex shrink-0 items-center gap-1 text-muted">
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move up"
                className="hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                disabled={pending || index === items.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
                className="hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="Remove from list"
                className="hover:text-accent"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
