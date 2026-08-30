"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type AlbumOption = {
  id: string;
  title: string;
  coverUrl: string | null;
  artist: { name: string };
};

export function FiveFavesEditor({ initial }: { initial: AlbumOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AlbumOption[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlbumOption[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const handle = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.albums);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function addAlbum(album: AlbumOption) {
    if (selected.length >= 5) return;
    if (selected.some((a) => a.id === album.id)) return;
    setSelected([...selected, album]);
    setQuery("");
    setResults([]);
  }

  function removeAlbum(id: string) {
    setSelected(selected.filter((a) => a.id !== id));
  }

  async function save() {
    setPending(true);
    const res = await fetch("/api/five-faves", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumIds: selected.map((a) => a.id) }),
    });
    setPending(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted hover:text-accent"
      >
        Edit Five Faves
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        {selected.map((album) => (
          <div key={album.id} className="relative w-20">
            <div className="relative aspect-square w-20 overflow-hidden rounded-md bg-surface-2">
              {album.coverUrl && (
                <Image src={album.coverUrl} alt={album.title} fill sizes="80px" className="object-cover" />
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAlbum(album.id)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground"
            >
              ×
            </button>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 5 - selected.length) }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-square w-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted"
          >
            empty
          </div>
        ))}
      </div>

      {selected.length < 5 && (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search albums to add…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface-2 p-1 shadow-lg">
              {results.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => addAlbum(album)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                >
                  <span className="truncate">{album.title}</span>
                  <span className="truncate text-xs text-muted">
                    {album.artist.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
