"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function EditProfileForm({
  initialName,
  initialBio,
  initialAvatarUrl,
}: {
  initialName: string;
  initialBio: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [pending, setPending] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    setPending(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAvatarPending(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    setAvatarPending(false);
    e.target.value = "";
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not upload image");
      return;
    }
    const data = await res.json();
    setAvatarUrl(data.avatarUrl);
    router.refresh();
  }

  async function removePhoto() {
    setAvatarPending(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: "" }),
    });
    setAvatarPending(false);
    if (res.ok) {
      setAvatarUrl(null);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
      >
        Edit profile
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-lg font-medium uppercase text-accent ring-1 ring-border">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar preview"
              width={64}
              height={64}
              priority
              className="h-full w-full object-cover"
            />
          ) : (
            (name || "?").slice(0, 2)
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
              className="text-xs text-accent hover:underline disabled:opacity-50"
            >
              {avatarPending ? "Uploading…" : "Change photo"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={avatarPending}
                className="text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">PNG, JPEG, WebP, or GIF. Max 3MB.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
