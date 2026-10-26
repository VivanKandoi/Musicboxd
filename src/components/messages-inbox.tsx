"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Conversation = {
  conversationId: string;
  isGroup: boolean;
  title: string | null;
  user: { id: string; username: string; name: string | null; avatarUrl: string | null };
  lastMessage: { text: string | null; createdAt: string; senderId: string };
  unreadCount: number;
};

function preview(text: string | null) {
  if (!text) return "Shared an album";
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

export function MessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const res = await fetch("/api/messages");
      if (!res.ok || !active) return;
      const data = await res.json();
      setConversations(data.conversations);
    }
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (conversations === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (conversations.length === 0) {
    return <p className="text-sm text-muted">No conversations yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {conversations.map((c) => (
        <Link
          key={c.conversationId}
          href={`/messages/${c.user.username}`}
          className="flex items-center gap-3 p-3 hover:bg-surface-2"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-medium uppercase text-accent ring-1 ring-border">
            {c.user.avatarUrl ? (
              <Image
                src={c.user.avatarUrl}
                alt={c.user.username}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              c.user.username.slice(0, 2)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {c.isGroup ? c.title ?? "Group chat" : c.user.name || c.user.username}
            </p>
            <p className="truncate text-xs text-muted">{preview(c.lastMessage.text)}</p>
          </div>
          {c.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-medium text-accent-foreground">
              {c.unreadCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
