"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function PremiumToggle({ initialEnabled, features }: { initialEnabled: boolean; features: string[] }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !enabled;
    setPending(true);
    const res = await fetch("/api/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setPending(false);
    if (res.ok) {
      setEnabled(next);
      router.refresh();
    }
  }

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-1.5 text-lg font-medium">
        <Sparkles size={16} className="text-accent" />
        Premium <span className="text-xs font-normal text-muted">(demo)</span>
      </h2>
      <p className="mb-3 text-sm text-muted">
        A preview of Premium features. There&rsquo;s no billing — this switch just turns them on for your account.
      </p>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
        <span className="text-sm text-foreground">Premium features</span>
        <button
          type="button"
          role="switch"
          aria-label="Premium features"
          aria-checked={enabled}
          disabled={pending}
          onClick={toggle}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-accent" : "bg-surface-2"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
              enabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
      <ul className="mt-2 list-inside list-disc text-xs text-muted">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </section>
  );
}
