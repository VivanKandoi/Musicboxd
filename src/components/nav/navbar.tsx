import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/nav/logout-button";
import { SearchBox } from "@/components/nav/search-box";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-foreground"
        >
          First <span className="text-accent">Log</span>
        </Link>

        <div className="hidden flex-1 sm:block">
          <SearchBox />
        </div>

        <nav className="ml-auto flex items-center gap-4">
          {session?.user ? (
            <>
              <Link
                href="/"
                className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
              >
                Home
              </Link>
              <Link
                href={`/u/${session.user.username}`}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-medium uppercase text-accent">
                  {session.user.username?.slice(0, 2)}
                </span>
                <span className="hidden sm:inline">{session.user.username}</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
