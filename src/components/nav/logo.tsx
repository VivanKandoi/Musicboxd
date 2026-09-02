import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
        1
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        MusicBoxd
      </span>
    </Link>
  );
}
