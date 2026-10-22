"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DmPrivacy = "everyone" | "followers" | "none";

type Preferences = {
  isPrivate: boolean;
  dmPrivacy: DmPrivacy;
  notifyOnFollow: boolean;
  notifyOnLike: boolean;
  notifyOnComment: boolean;
  notifyOnMessage: boolean;
  emailNotifications: boolean;
};

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: Partial<Preferences>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setPending(true);
    setSaved(false);
    const res = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setPending(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-lg font-medium">Privacy</h2>
        <p className="mb-3 text-sm text-muted">
          Control who can see your activity and message you.
        </p>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
          <span className="text-sm text-foreground">Private profile</span>
          <Toggle
            checked={prefs.isPrivate}
            onChange={(v) => save({ isPrivate: v })}
            disabled={pending}
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Only approved followers can see your diary, stats, and five faves.
        </p>

        <div className="mt-3">
          <p className="mb-2 text-sm text-foreground">Who can message you</p>
          <div className="flex gap-2">
            {(["everyone", "followers", "none"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={pending}
                onClick={() => save({ dmPrivacy: opt })}
                className={
                  opt === prefs.dmPrivacy
                    ? "rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
                    : "rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground disabled:opacity-60"
                }
              >
                {opt === "everyone" ? "Everyone" : opt === "followers" ? "Followers only" : "No one"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Notifications</h2>
        <p className="mb-3 text-sm text-muted">Choose what notifies you in-app.</p>
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="New followers"
            checked={prefs.notifyOnFollow}
            onChange={(v) => save({ notifyOnFollow: v })}
            disabled={pending}
          />
          <ToggleRow
            label="Likes on your logs"
            checked={prefs.notifyOnLike}
            onChange={(v) => save({ notifyOnLike: v })}
            disabled={pending}
          />
          <ToggleRow
            label="Comments on your logs"
            checked={prefs.notifyOnComment}
            onChange={(v) => save({ notifyOnComment: v })}
            disabled={pending}
          />
          <ToggleRow
            label="Direct messages"
            checked={prefs.notifyOnMessage}
            onChange={(v) => save({ notifyOnMessage: v })}
            disabled={pending}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Email</h2>
        <p className="mb-3 text-sm text-muted">
          Email delivery isn&rsquo;t wired up yet in this build — this preference will
          gate email sends once it is.
        </p>
        <ToggleRow
          label="Email notifications"
          checked={prefs.emailNotifications}
          onChange={(v) => save({ emailNotifications: v })}
          disabled={pending}
        />
      </section>

      <p className="text-xs text-muted">
        {pending ? "Saving…" : saved ? "Saved." : ""}
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-accent" : "bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
