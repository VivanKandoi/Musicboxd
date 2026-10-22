"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Send } from "lucide-react";
import { StarRating } from "@/components/star-rating";

type Message = {
  id: string;
  text: string | null;
  createdAt: string;
  sender: { id: string; username: string; name: string | null; avatarUrl: string | null };
  sharedAlbum: {
    id: string;
    title: string;
    coverUrl: string | null;
    artist: { name: string };
  } | null;
  sharedLog: {
    id: string;
    rating: number | null;
    reviewText: string | null;
    album: { id: string; title: string; coverUrl: string | null; artist: { name: string } };
  } | null;
};

export function MessageThread({ username }: { username: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [other, setOther] = useState<{ username: string; name: string | null } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const res = await fetch(`/api/messages/${username}`);
      if (!active) return;
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(data.messages);
      setOther(data.other);
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || pending) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/messages/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft.trim() }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Couldn't send");
      return;
    }
    const message = await res.json();
    setMessages((prev) => [...(prev ?? []), message]);
    setDraft("");
  }

  const myId = session?.user?.id;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="border-b border-border p-3">
        <Link href={`/u/${username}`} className="text-sm font-medium text-foreground hover:text-accent">
          {other?.name || other?.username || username}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages === null ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted">No messages yet — say hi.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const isMine = m.sender.id === myId;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-2 text-foreground"
                    }`}
                  >
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    {(m.sharedAlbum || m.sharedLog) && (
                      <SharedPreview message={m} isMine={isMine} />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="px-3 text-xs text-accent">{error}</p>}

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label="Send"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

function SharedPreview({ message, isMine }: { message: Message; isMine: boolean }) {
  const album = message.sharedAlbum ?? message.sharedLog?.album;
  if (!album) return null;
  const href = `/album/${album.id}`;

  return (
    <Link
      href={href}
      className={`mt-2 flex items-center gap-2 rounded-lg p-2 ${
        isMine ? "bg-accent-foreground/10" : "bg-background"
      }`}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
        {album.coverUrl && (
          <Image src={album.coverUrl} alt={album.title} fill sizes="40px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{album.title}</p>
        <p className="truncate text-[11px] opacity-80">{album.artist.name}</p>
        {message.sharedLog?.rating != null && (
          <StarRating value={message.sharedLog.rating} readOnly size="sm" />
        )}
      </div>
    </Link>
  );
}
