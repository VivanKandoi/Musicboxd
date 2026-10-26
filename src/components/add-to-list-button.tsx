"use client";

import { useState } from "react";
import { ListPlus, Check } from "lucide-react";

type ListSummary = { id: string; title: string; _count: { items: number } };

export function AddToListButton({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListSummary[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && lists === null) {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists);
      }
    }
  }

  async function addToList(listId: string) {
    setPending(true);
    const res = await fetch(`/api/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId }),
    });
    setPending(false);
    if (res.ok) {
      setAddedTo((prev) => new Set(prev).add(listId));
    }
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return;
    setPending(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const list = await res.json();
      await fetch(`/api/lists/${list.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });
      setLists((prev) => [{ id: list.id, title: list.title, _count: { items: 1 } }, ...(prev ?? [])]);
      setAddedTo((prev) => new Set(prev).add(list.id));
      setNewTitle("");
    }
    setPending(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-accent hover:text-foreground"
      >
        <ListPlus size={14} />
        Add to list
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-20 z-40 rounded-lg border border-border bg-surface p-2 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:z-20 sm:mt-2 sm:w-64">
            {lists === null ? (
              <p className="px-2 py-2 text-xs text-muted">Loading…</p>
            ) : lists.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted">No lists yet — create one below.</p>
            ) : (
              <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    disabled={pending}
                    onClick={() => addToList(l.id)}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-2 disabled:opacity-50"
                  >
                    <span className="truncate">{l.title}</span>
                    {addedTo.has(l.id) && <Check size={13} className="shrink-0 text-accent" />}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New list name…"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                disabled={pending || !newTitle.trim()}
                onClick={createAndAdd}
                className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
