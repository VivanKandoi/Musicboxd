"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StarRating } from "@/components/star-rating";

type Comment = {
  id: string;
  text: string;
  createdAt: string | Date;
  user: { username: string; name: string | null };
};

export type ActivityLog = {
  id: string;
  rating: number | null;
  reviewText: string | null;
  listenedAt: string | Date;
  isRelisten: boolean;
  createdAt: string | Date;
  user: { id: string; username: string; name: string | null; avatarUrl: string | null };
  album: { id: string; title: string; coverUrl: string | null; artist: { name: string } };
  _count: { likes: number; comments: number };
  likedByMe: boolean;
};

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return "just now";
}

export function ActivityItem({
  log,
  isAuthenticated,
}: {
  log: ActivityLog;
  isAuthenticated: boolean;
}) {
  const [liked, setLiked] = useState(log.likedByMe);
  const [likeCount, setLikeCount] = useState(log._count.likes);
  const [commentCount, setCommentCount] = useState(log._count.comments);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [pending, setPending] = useState(false);

  async function toggleLike() {
    if (!isAuthenticated) return;
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    const res = await fetch(`/api/logs/${log.id}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.count);
    }
  }

  async function loadComments() {
    setShowComments((v) => !v);
    if (comments === null) {
      const res = await fetch(`/api/logs/${log.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      } else {
        setComments([]);
      }
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || pending) return;
    setPending(true);
    const res = await fetch(`/api/logs/${log.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText.trim() }),
    });
    setPending(false);
    if (res.ok) {
      const newComment = await res.json();
      setComments((c) => [...(c ?? []), newComment]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    }
  }

  return (
    <div className="flex gap-3 border-b border-border py-4 last:border-0">
      <Link href={`/album/${log.album.id}`} className="shrink-0">
        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border sm:h-20 sm:w-20">
          {log.album.coverUrl && (
            <Image
              src={log.album.coverUrl}
              alt={log.album.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          <Link
            href={`/u/${log.user.username}`}
            className="font-medium text-foreground hover:text-accent"
          >
            {log.user.name || log.user.username}
          </Link>{" "}
          {log.isRelisten ? "relistened to" : "logged"}{" "}
          <Link
            href={`/album/${log.album.id}`}
            className="text-foreground hover:text-accent"
          >
            {log.album.title}
          </Link>{" "}
          <span className="text-muted">· {log.album.artist.name}</span>
        </p>

        {log.rating != null && (
          <div className="mt-1">
            <StarRating value={log.rating} readOnly size="sm" />
          </div>
        )}

        {log.reviewText && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {log.reviewText}
          </p>
        )}

        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span>{timeAgo(log.listenedAt)}</span>
          <button
            type="button"
            onClick={toggleLike}
            disabled={!isAuthenticated}
            className={`flex items-center gap-1 transition-colors ${
              liked ? "text-accent" : "hover:text-foreground"
            } disabled:cursor-not-allowed`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={loadComments}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <span>💬</span>
            <span>{commentCount}</span>
          </button>
        </div>

        {showComments && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-surface p-3">
            {comments === null ? (
              <p className="text-xs text-muted">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <p key={c.id} className="text-xs text-foreground/90">
                  <span className="font-medium text-foreground">
                    {c.user.name || c.user.username}
                  </span>{" "}
                  {c.text}
                </p>
              ))
            )}
            {isAuthenticated && (
              <form onSubmit={submitComment} className="mt-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
