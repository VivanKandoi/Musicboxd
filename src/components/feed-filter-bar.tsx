"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";

type Person = { id: string; username: string; name: string | null };
type Option = { id: string; label: string };

function SearchCombobox({
  placeholder,
  onSelect,
  fetchField,
}: {
  placeholder: string;
  onSelect: (option: Option) => void;
  fetchField: "albums" | "artists";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);

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
        const raw = data[fetchField] as { id: string; title?: string; name?: string }[];
        setResults(raw.map((r) => ({ id: r.id, label: r.title ?? r.name ?? "" })));
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, fetchField]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-40 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none sm:w-48"
      />
      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-border bg-surface-2 p-1 shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(r);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface"
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FeedFilterBar({
  people,
  activeUserLabel,
  activeArtistLabel,
  activeAlbumLabel,
}: {
  people: Person[];
  activeUserLabel: string | null;
  activeArtistLabel: string | null;
  activeAlbumLabel: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasActiveFilter = activeUserLabel || activeArtistLabel || activeAlbumLabel;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("user") ?? ""}
        onChange={(e) => setParam("user", e.target.value || null)}
        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
      >
        <option value="">All people</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.username}
          </option>
        ))}
      </select>

      <SearchCombobox
        placeholder="Filter by artist…"
        fetchField="artists"
        onSelect={(o) => setParam("artist", o.id)}
      />

      <SearchCombobox
        placeholder="Filter by album…"
        fetchField="albums"
        onSelect={(o) => setParam("album", o.id)}
      />

      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeUserLabel && <FilterChip label={activeUserLabel} onClear={() => setParam("user", null)} />}
          {activeArtistLabel && (
            <FilterChip label={activeArtistLabel} onClear={() => setParam("artist", null)} />
          )}
          {activeAlbumLabel && (
            <FilterChip label={activeAlbumLabel} onClear={() => setParam("album", null)} />
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove ${label} filter`}>
        <X size={12} />
      </button>
    </span>
  );
}
