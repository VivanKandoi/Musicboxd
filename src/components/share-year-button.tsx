"use client";

import { useState } from "react";
import { Check, Download, Link2 } from "lucide-react";

export function ShareYearButton({ username, year }: { username: string; year: number }) {
  const [copied, setCopied] = useState(false);
  const cardUrl = `/api/year-in-review/${encodeURIComponent(username)}/${year}/card`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/u/${username}/year/${year}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex shrink-0 gap-2">
      <a
        href={cardUrl}
        download={`${username}-${year}-in-music.png`}
        className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        <Download size={14} />
        Share image
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
      >
        {copied ? <Check size={14} className="text-accent" /> : <Link2 size={14} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
