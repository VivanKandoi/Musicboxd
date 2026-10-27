"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value || tags.includes(value) || tags.length >= 8) return;
    onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">
        Listening context <span className="font-normal">(e.g. road trip, rainy day)</span>
      </span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 focus-within:border-accent">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="text-muted hover:text-foreground"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {tags.length < 8 && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(draft)}
            placeholder={tags.length === 0 ? "Add a tag and press Enter…" : ""}
            className="min-w-[100px] flex-1 bg-transparent py-0.5 text-xs text-foreground placeholder:text-muted focus:outline-none"
          />
        )}
      </div>
    </label>
  );
}

export function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
