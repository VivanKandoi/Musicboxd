"use client";

import { useState } from "react";

const STAR_COUNT = 5;

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const sizeClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const interactive = !readOnly && Boolean(onChange);

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${sizeClass}`}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const starIndex = i + 1;
        const fillPct = Math.max(0, Math.min(1, display - i)) * 100;
        return (
          <span
            key={i}
            className="relative inline-block leading-none"
            style={{ width: "1em", height: "1em" }}
          >
            <span className="pointer-events-none select-none text-border">
              ★
            </span>
            <span
              className="pointer-events-none absolute inset-0 select-none overflow-hidden text-star"
              style={{ width: `${fillPct}%` }}
            >
              ★
            </span>
            {interactive && (
              <span className="absolute inset-0 flex">
                <button
                  type="button"
                  aria-label={`Rate ${starIndex - 0.5} stars`}
                  className="h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(starIndex - 0.5)}
                  onClick={() => onChange?.(starIndex - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`Rate ${starIndex} stars`}
                  className="h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(starIndex)}
                  onClick={() => onChange?.(starIndex)}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
