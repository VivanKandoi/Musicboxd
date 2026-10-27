"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, RotateCcw } from "lucide-react";

export function CustomCoverControl({ albumId, hasCustomCover }: { albumId: string; hasCustomCover: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/albums/${albumId}/cover`, { method: "PUT", body: form });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
    }
  }

  async function reset() {
    setPending(true);
    await fetch(`/api/albums/${albumId}/cover`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 text-xs text-muted">
        <button
          type="button"
          disabled={pending}
          onClick={() => input.current?.click()}
          className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
        >
          <ImageUp size={13} />
          {hasCustomCover ? "Change my cover" : "Use my own cover"}
        </button>
        {hasCustomCover && (
          <button
            type="button"
            disabled={pending}
            onClick={reset}
            className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-accent">{error}</p>}
      <p className="text-[11px] text-muted">Only you see your custom cover.</p>
    </div>
  );
}
