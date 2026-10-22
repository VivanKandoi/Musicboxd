"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { EditLogForm } from "@/components/edit-log-form";
import { TagChips } from "@/components/tag-input";

export type JournalLog = {
  id: string;
  rating: number | null;
  reviewText: string | null;
  listenedAt: string | Date;
  isRelisten: boolean;
  album: { id: string; title: string; coverUrl: string | null; artist: { name: string } };
  contextTags: { tag: { name: string } }[];
};

export function JournalEntryCard({
  log,
  isOwner,
}: {
  log: JournalLog;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this log? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/logs/${log.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDeleted(true);
      router.refresh();
    }
  }

  if (deleted) return null;

  if (editing) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
          {log.album.coverUrl && (
            <Image
              src={log.album.coverUrl}
              alt={log.album.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <EditLogForm
            logId={log.id}
            initialRating={log.rating}
            initialReviewText={log.reviewText}
            initialListenedAt={log.listenedAt}
            initialIsRelisten={log.isRelisten}
            initialTags={log.contextTags.map((t) => t.tag.name)}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
      <Link href={`/album/${log.album.id}`} className="shrink-0">
        <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
          {log.album.coverUrl && (
            <Image
              src={log.album.coverUrl}
              alt={log.album.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          )}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/album/${log.album.id}`}
              className="truncate text-sm font-medium text-foreground hover:text-accent"
            >
              {log.album.title}
            </Link>
            <p className="truncate text-xs text-muted">{log.album.artist.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {log.rating != null && <StarRating value={log.rating} readOnly size="sm" />}
            {isOwner && (
              <div className="flex items-center gap-2 text-muted">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit log"
                  className="hover:text-foreground"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Delete log"
                  className="hover:text-accent disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
        {log.reviewText && (
          <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
            &ldquo;{log.reviewText}&rdquo;
          </p>
        )}
        <TagChips tags={log.contextTags.map((t) => t.tag.name)} />
      </div>
    </div>
  );
}
