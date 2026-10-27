"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Check } from "lucide-react";

type Recipient = { id: string; username: string; name: string | null };

export function ShareToDmButton({
  sharedAlbumId,
  sharedLogId,
  label = "Share",
}: {
  sharedAlbumId?: string;
  sharedLogId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && recipients === null) {
      const res = await fetch("/api/users/following");
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.following);
      }
    }
  }

  async function send(username: string) {
    setError(null);
    const res = await fetch(`/api/messages/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedAlbumId, sharedLogId }),
    });
    if (res.ok) {
      setSentTo(username);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Couldn't send");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
      >
        <Share2 size={13} />
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-20 z-40 rounded-lg border border-border bg-surface p-2 shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:z-20 sm:mt-2 sm:w-56">
            <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              Send to
            </p>
            {recipients === null ? (
              <p className="px-1 py-2 text-xs text-muted">Loading…</p>
            ) : recipients.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted">
                Follow people to share with them.
              </p>
            ) : (
              <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                {recipients.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => send(r.username)}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-2"
                  >
                    <span className="truncate">{r.name || r.username}</span>
                    {sentTo === r.username && <Check size={13} className="shrink-0 text-accent" />}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mt-1 px-1 text-[11px] text-accent">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
