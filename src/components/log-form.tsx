"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Check, Plus, Repeat, X } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { TagInput } from "@/components/tag-input";

export function LogForm({
  albumId,
  hasLoggedBefore,
  defaultOpen = false,
  album,
}: {
  albumId: string;
  hasLoggedBefore: boolean;
  defaultOpen?: boolean;
  album?: { title: string; artist: string; coverUrl: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [listenedAt, setListenedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [isRelisten, setIsRelisten] = useState(hasLoggedBefore);
  const [tags, setTags] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The dialog is portalled to <body> so ancestors' stacking contexts can't trap it under the navbar.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(timer);
  }, [saved]);

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
        tags,
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
    setTags([]);
    setIsRelisten(true);
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-md shadow-accent/20 transition-opacity hover:opacity-90"
      >
        <Plus size={16} strokeWidth={2.5} />
        {hasLoggedBefore ? "Log another listen" : "Log this album"}
      </button>

      {mounted &&
        createPortal(
          <>
            <AnimatePresence>
              {open && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.form
                    onSubmit={handleSubmit}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="log-form-title"
                    className="relative flex max-h-[92vh] w-full flex-col gap-5 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{
                      type: "spring",
                      duration: 0.35,
                      bounce: 0.12,
                    }}
                  >
                    <div
                      className="mx-auto -mt-2 h-1 w-10 rounded-full bg-border sm:hidden"
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-3">
                      {album && (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                          {album.coverUrl && (
                            <Image
                              src={album.coverUrl}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3
                          id="log-form-title"
                          className="text-xs font-medium uppercase tracking-wide text-accent"
                        >
                          {hasLoggedBefore
                            ? "Log another listen"
                            : "Log this listen"}
                        </h3>
                        {album && (
                          <>
                            <p className="truncate text-base font-semibold text-foreground">
                              {album.title}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {album.artist}
                            </p>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1 rounded-2xl bg-background/60 py-4">
                      <StarRating
                        value={rating}
                        onChange={setRating}
                        size="lg"
                      />
                      <p className="h-4 text-xs text-muted">
                        {rating == null
                          ? "Tap a star to rate (optional)"
                          : RATING_WORDS[Math.ceil(rating) - 1]}
                        {rating != null && (
                          <button
                            type="button"
                            onClick={() => setRating(null)}
                            className="ml-2 underline hover:text-foreground"
                          >
                            clear
                          </button>
                        )}
                      </p>
                    </div>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted">
                        Your thoughts
                      </span>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="What stood out? A track, a lyric, a feeling… (optional)"
                        rows={4}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
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

                    <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {pending ? "Saving…" : "Save to journal"}
                      </button>
                    </div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {saved && (
                <motion.div
                  role="status"
                  className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                >
                  <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground shadow-xl">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-background">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    Saved to your journal
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
}

const subscribeNoop = () => () => {};

const RATING_WORDS = [
  "Not for me",
  "It was okay",
  "Liked it",
  "Really liked it",
  "Loved it",
];
