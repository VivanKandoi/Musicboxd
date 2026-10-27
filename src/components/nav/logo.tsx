import Link from "next/link";
import { Disc3 } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label="MusicBoxd home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-md shadow-accent/30 transition-transform duration-500 group-hover:rotate-180">
        <Disc3 size={18} strokeWidth={2.25} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">MusicBoxd</span>
    </Link>
  );
}
