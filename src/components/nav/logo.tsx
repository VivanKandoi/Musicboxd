import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="text-lg font-semibold tracking-tight text-foreground">
        MusicBoxd
      </span>
    </Link>
  );
}
