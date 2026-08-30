"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_COLORS, type ThemeColorId, type ThemeMode } from "@/lib/theme";

export function SettingsForm({
  initialThemeColor,
  initialThemeMode,
}: {
  initialThemeColor: ThemeColorId;
  initialThemeMode: ThemeMode;
}) {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState<ThemeColorId>(initialThemeColor);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: { themeColor: ThemeColorId; themeMode: ThemeMode }) {
    setPending(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
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

  function selectColor(id: ThemeColorId) {
    setThemeColor(id);
    save({ themeColor: id, themeMode });
  }

  function selectMode(mode: ThemeMode) {
    setThemeMode(mode);
    save({ themeColor, themeMode: mode });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-lg font-medium">Accent color</h2>
        <p className="mb-3 text-sm text-muted">
          Pick the color used for buttons, links, and highlights.
        </p>
        <div className="flex flex-wrap gap-3">
          {THEME_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectColor(c.id)}
              disabled={pending}
              className="flex flex-col items-center gap-2 disabled:opacity-60"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full ring-2 transition-all"
                style={{
                  backgroundColor: c.accent,
                  ...(themeColor === c.id
                    ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${c.accent}` }
                    : {}),
                }}
              >
                {themeColor === c.id && (
                  <span style={{ color: c.accentForeground }}>✓</span>
                )}
              </span>
              <span className="text-xs text-muted">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Appearance</h2>
        <p className="mb-3 text-sm text-muted">Choose a light or dark interface.</p>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => selectMode(mode)}
              disabled={pending}
              className={
                mode === themeMode
                  ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
                  : "rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground disabled:opacity-60"
              }
            >
              {mode === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">
        {pending ? "Saving…" : saved ? "Saved." : ""}
      </p>
    </div>
  );
}
