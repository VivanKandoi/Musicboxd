"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/list-invites/${token}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/lists/${data.listId}`);
    } else {
      setPending(false);
      setError(data.error ?? "Couldn't join this list");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={accept}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join as editor"}
      </button>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
