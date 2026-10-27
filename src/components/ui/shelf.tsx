"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A horizontal row of cards: snap scrolling, edge fades, and arrow buttons on pointer devices.
export function Shelf({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="group/shelf relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden [&>*]:snap-start"
      >
        {children}
      </div>
      {/* Edge fades as overlays: CSS masks on scrollers drop their contents in WebKit. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity ${
          edges.start ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity ${
          edges.end ? "opacity-0" : "opacity-100"
        }`}
      />
      {!edges.start && (
        <ShelfButton side="left" onClick={() => scroll(-1)} />
      )}
      {!edges.end && (
        <ShelfButton side="right" onClick={() => scroll(1)} />
      )}
    </div>
  );
}

function ShelfButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      className={`absolute top-[38%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground opacity-0 shadow-lg backdrop-blur transition-opacity group-hover/shelf:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:flex ${
        side === "left" ? "-left-3" : "-right-3"
      }`}
    >
      <Icon size={18} />
    </button>
  );
}
