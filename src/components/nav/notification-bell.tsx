"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";

type Notification = {
  id: string;
  type: "follow" | "like" | "comment" | "message";
  read: boolean;
  createdAt: string;
  actor: { username: string; name: string | null; avatarUrl: string | null } | null;
  log: { id: string; albumId: string; album: { title: string } } | null;
};

const ICONS = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  message: MessageCircle,
};

function describe(n: Notification) {
  const actor = n.actor?.name || n.actor?.username || "Someone";
  switch (n.type) {
    case "follow":
      return `${actor} started following you`;
    case "like":
      return `${actor} liked your log${n.log ? ` of ${n.log.album.title}` : ""}`;
    case "comment":
      return `${actor} commented on your log${n.log ? ` of ${n.log.album.title}` : ""}`;
    case "message":
      return `${actor} sent you a message`;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok || !active) return;
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // ignore transient network errors
      }
    }
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-border bg-surface p-2 shadow-lg">
            {notifications.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted">
                You&rsquo;re all caught up — no new notifications.
              </p>
            ) : (
              <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = ICONS[n.type];
                  const content = (
                    <div
                      className={`flex items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-surface-2 ${
                        n.read ? "text-muted" : "text-foreground"
                      }`}
                    >
                      <Icon size={14} className="mt-0.5 shrink-0 text-accent" />
                      <span className="flex-1">{describe(n)}</span>
                    </div>
                  );
                  return n.log ? (
                    <Link
                      key={n.id}
                      href={`/album/${n.log.albumId}`}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : n.actor ? (
                    <Link
                      key={n.id}
                      href={`/u/${n.actor.username}`}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
