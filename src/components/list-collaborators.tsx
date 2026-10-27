"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, UserMinus, Users } from "lucide-react";

type Member = { role: string; user: { id: string; username: string; name: string | null } };
type Invite = { id: string; token: string };

export function ListCollaborators({
  listId,
  viewerId,
  viewerRole,
  members,
  invites: initialInvites,
}: {
  listId: string;
  viewerId: string | null;
  viewerRole: "owner" | "editor" | null;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isOwner = viewerRole === "owner";

  function inviteUrl(token: string) {
    return `${window.location.origin}/lists/invite/${token}`;
  }

  async function createInvite() {
    setPending(true);
    const res = await fetch(`/api/lists/${listId}/invites`, { method: "POST" });
    setPending(false);
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [{ id: invite.id, token: invite.token }, ...prev]);
    }
  }

  async function revokeInvite(inviteId: string) {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    await fetch(`/api/lists/${listId}/invites/${inviteId}`, { method: "DELETE" });
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  async function removeMember(userId: string) {
    const leaving = userId === viewerId;
    if (leaving && !confirm("Leave this list? You'll need a new invite to rejoin.")) return;
    setPending(true);
    const res = await fetch(`/api/lists/${listId}/members/${userId}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <aside className="flex h-fit flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Users size={14} className="text-accent" />
          Collaborators
        </h2>
        <ul className="flex flex-col gap-1.5">
          {members.map((m) => (
            <li key={m.user.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/u/${m.user.username}`} className="truncate text-foreground hover:text-accent">
                {m.user.name || m.user.username}
              </Link>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                {m.role === "owner" ? "Owner" : "Editor"}
                {m.role === "editor" && (isOwner || m.user.id === viewerId) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeMember(m.user.id)}
                    aria-label={m.user.id === viewerId ? "Leave list" : `Remove ${m.user.username}`}
                    title={m.user.id === viewerId ? "Leave list" : "Remove"}
                    className="hover:text-accent disabled:opacity-50"
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isOwner && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted">
            Anyone with an invite link can join as an editor and add, remove or reorder albums.
          </p>
          {invites.map((invite) => (
            <div key={invite.id} className="mb-2 flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1 text-[11px] text-muted">
                /lists/invite/{invite.token}
              </code>
              <button
                type="button"
                onClick={() => copy(invite.token)}
                aria-label="Copy invite link"
                className="text-muted hover:text-foreground"
              >
                {copied === invite.token ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={() => revokeInvite(invite.id)}
                className="text-[11px] text-muted hover:text-accent"
              >
                Revoke
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={createInvite}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground disabled:opacity-50"
          >
            <Link2 size={13} />
            Create invite link
          </button>
        </div>
      )}
    </aside>
  );
}
