"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Disc3,
  ListMusic,
  Mic2,
  PartyPopper,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Compass,
  type LucideIcon,
} from "lucide-react";

// One search box for the whole app: jump to an album, artist or person, or pick an album to log.
// Open it with ⌘K / Ctrl+K, "/", or openCommandPalette() from any button.

type Mode = "search" | "log";

const OPEN_EVENT = "musicboxd:command-palette";

export function openCommandPalette(mode: Mode = "search") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { mode } }));
}

type Results = {
  albums: { id: string; title: string; coverUrl: string | null; releaseDate: string | null; artist: { name: string } }[];
  artists: { id: string; name: string; _count: { albums: number } }[];
  users: { id: string; username: string; name: string | null; avatarUrl: string | null }[];
};

type Item = {
  id: string;
  group: string;
  label: string;
  detail?: string;
  href: string;
  icon?: LucideIcon;
  image?: string | null;
  round?: boolean;
  logHref?: string;
};

const EMPTY: Results = { albums: [], artists: [], users: [] };
const noop = () => () => {};

function shortcuts(username: string | null): Item[] {
  const you = username
    ? [
        { id: "journal", label: "Your journal", href: `/u/${username}/diary`, icon: BookOpen },
        { id: "lists", label: "Your lists", href: `/u/${username}/lists`, icon: ListMusic },
        { id: "year", label: "Year in review", href: `/u/${username}/year`, icon: PartyPopper },
        { id: "profile", label: "Your profile", href: `/u/${username}`, icon: UserRound },
      ]
    : [];
  return [
    { id: "discover", label: "Discover music by mood or story", href: "/discover", icon: Sparkles },
    { id: "guides", label: "Genre guides", href: "/guides", icon: Compass },
    { id: "releases", label: "Release calendar", href: "/releases", icon: CalendarDays },
    ...you,
    ...(username ? [{ id: "settings", label: "Settings", href: "/settings", icon: Settings }] : []),
  ].map((item) => ({ ...item, group: "Go to" }));
}

export function CommandPalette({ username }: { username: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const show = useCallback((next: Mode) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setMode(next);
    setQuery("");
    setResults(EMPTY);
    setActive(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => show((e as CustomEvent<{ mode?: Mode }>).detail?.mode ?? "search");
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show("search");
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        show("search");
      }
    };
    window.addEventListener(OPEN_EVENT, onEvent);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onEvent);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced live search; stale responses are dropped.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          setResults(await res.json());
          setActive(0);
        }
      } catch {
        // aborted or offline: keep the previous results
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    if (!q) return mode === "log" ? [] : shortcuts(username);
    const albums: Item[] = results.albums.map((a) => ({
      id: `album-${a.id}`,
      group: mode === "log" ? "Pick an album to log" : "Albums",
      label: a.title,
      detail: [a.artist.name, a.releaseDate ? new Date(a.releaseDate).getFullYear() : null].filter(Boolean).join(" · "),
      href: mode === "log" ? `/album/${a.id}?log=1` : `/album/${a.id}`,
      logHref: mode === "log" ? undefined : `/album/${a.id}?log=1`,
      image: a.coverUrl,
      icon: Disc3,
    }));
    if (mode === "log") return albums;
    const artists: Item[] = results.artists.map((a) => ({
      id: `artist-${a.id}`,
      group: "Artists",
      label: a.name,
      detail: `${a._count.albums} ${a._count.albums === 1 ? "album" : "albums"}`,
      href: `/artist/${a.id}`,
      icon: Mic2,
    }));
    const users: Item[] = results.users.map((u) => ({
      id: `user-${u.id}`,
      group: "People",
      label: u.name || u.username,
      detail: `@${u.username}`,
      href: `/u/${u.username}`,
      image: u.avatarUrl,
      round: true,
      icon: UserRound,
    }));
    return [
      ...albums,
      ...artists,
      ...users,
      { id: "all", group: "More", label: `See all results for “${q}”`, href: `/search?q=${encodeURIComponent(q)}`, icon: Search },
      { id: "vibe", group: "More", label: `Find songs that feel like “${q}”`, href: `/discover?q=${encodeURIComponent(q)}`, icon: Sparkles },
    ];
  }, [query, results, mode, username]);

  const current = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(items.length ? (current + 1) % items.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(items.length ? (current - 1 + items.length) % items.length : 0);
    } else if (e.key === "Enter" && items[current]) {
      e.preventDefault();
      const item = items[current];
      go(e.shiftKey && item.logHref ? item.logHref : item.href);
    }
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh] sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === "log" ? "Log an album" : "Search MusicBoxd"}
            className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              {mode === "log" ? (
                <Plus size={18} className="shrink-0 text-accent" />
              ) : (
                <Search size={18} className="shrink-0 text-muted" />
              )}
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                  setLoading(Boolean(e.target.value.trim()));
                }}
                placeholder={mode === "log" ? "Which album did you listen to?" : "Search albums, artists, people…"}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={items[current] ? `cp-${items[current].id}` : undefined}
                aria-autocomplete="list"
                className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
              />
              {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted/30 border-t-accent" />}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "log" ? "search" : "log"));
                  setActive(0);
                  inputRef.current?.focus();
                }}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === "log" ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
                }`}
                title="Switch between searching and logging"
              >
                {mode === "log" ? "Logging" : "Log mode"}
              </button>
            </div>

            <div ref={listRef} id="command-palette-list" role="listbox" className="flex-1 overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Disc3 size={28} className="text-muted" />
                  <p className="text-sm text-foreground">
                    {query.trim()
                      ? loading
                        ? "Searching…"
                        : "Nothing matched. Try an artist name or a shorter title."
                      : "Start typing an album or artist."}
                  </p>
                  {mode === "log" && !query.trim() && (
                    <p className="text-xs text-muted">Pick it from the results and we&rsquo;ll open the log form for you.</p>
                  )}
                </div>
              ) : (
                items.map((item, index) => {
                  const header = item.group !== lastGroup ? item.group : null;
                  lastGroup = item.group;
                  const Icon = item.icon;
                  const selected = index === current;
                  return (
                    <div key={item.id}>
                      {header && (
                        <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted first:pt-1">
                          {header}
                        </p>
                      )}
                      <div
                        id={`cp-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={index}
                        onMouseMove={() => setActive(index)}
                        onClick={() => go(item.href)}
                        className={`group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${
                          selected ? "bg-surface-2" : ""
                        }`}
                      >
                        <span
                          className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden bg-surface-2 text-muted ring-1 ring-border ${
                            item.round ? "rounded-full" : "rounded-md"
                          }`}
                        >
                          {item.image ? (
                            <Image src={item.image} alt="" fill sizes="36px" className="object-cover" />
                          ) : (
                            Icon && <Icon size={16} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{item.label}</span>
                          {item.detail && <span className="block truncate text-xs text-muted">{item.detail}</span>}
                        </span>
                        {item.logHref && username && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              go(item.logHref!);
                            }}
                            className={`shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground ${
                              selected ? "flex" : "hidden sm:group-hover:flex"
                            }`}
                          >
                            <Plus size={12} />
                            Log
                          </button>
                        )}
                        {selected && !item.logHref && <ArrowRight size={14} className="shrink-0 text-muted" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted sm:flex">
              <span>
                <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
              </span>
              <span>
                <Kbd>↵</Kbd> to open
              </span>
              {mode === "search" && username && (
                <span>
                  <Kbd>⇧</Kbd> <Kbd>↵</Kbd> to log an album
                </span>
              )}
              <span className="ml-auto">
                <Kbd>esc</Kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] text-muted">
      {children}
    </kbd>
  );
}

// Looks like a search field; opens the palette.
export function SearchTrigger() {
  const mac = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true
  );
  return (
    <button
      type="button"
      onClick={() => openCommandPalette("search")}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground"
    >
      <Search size={15} className="shrink-0" />
      <span className="flex-1 truncate">Search or log an album…</span>
      <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
    </button>
  );
}

export function PaletteButton({
  mode = "search",
  className = "",
  children,
  ...rest
}: { mode?: Mode; className?: string; children: React.ReactNode } & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "type"
>) {
  return (
    <button type="button" onClick={() => openCommandPalette(mode)} className={className} {...rest}>
      {children}
    </button>
  );
}
