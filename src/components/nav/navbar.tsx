import Link from "next/link";
import Image from "next/image";
import { Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/nav/logo";
import { NavLinks } from "@/components/nav/nav-links";
import { NotificationBell } from "@/components/nav/notification-bell";
import { SearchBox } from "@/components/nav/search-box";
import { UserMenu } from "@/components/nav/user-menu";
import { LogoutButton } from "@/components/nav/logout-button";

export async function Navbar() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true },
      })
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Logo />

        {session?.user && <NavLinks username={session.user.username} />}

        <div className="ml-auto flex flex-1 items-center justify-end gap-4">
          <div className="hidden max-w-xs flex-1 sm:block">
            <SearchBox />
          </div>

          {session?.user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Settings size={17} />
              </Link>
              <UserMenu
                trigger={
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-medium uppercase text-accent ring-1 ring-border">
                      {user?.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={session.user.username}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        session.user.username?.slice(0, 2)
                      )}
                    </span>
                    <span className="hidden sm:inline">{session.user.username}</span>
                  </span>
                }
              >
                <Link
                  href={`/u/${session.user.username}`}
                  className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface-2"
                >
                  Profile
                </Link>
                <div className="my-1 border-t border-border" />
                <LogoutButton />
              </UserMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
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
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
