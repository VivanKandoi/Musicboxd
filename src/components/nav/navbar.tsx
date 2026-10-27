import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  Compass,
  ListMusic,
  PartyPopper,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/nav/logo";
import { MobileNav, NavLinks } from "@/components/nav/nav-links";
import { NotificationBell } from "@/components/nav/notification-bell";
import { MessagesLink } from "@/components/nav/messages-link";
import { UserMenu } from "@/components/nav/user-menu";
import { LogoutButton } from "@/components/nav/logout-button";
import { CommandPalette, PaletteButton, SearchTrigger } from "@/components/command-palette";

const menuItem =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-surface-2";

export async function Navbar() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true, name: true },
      })
    : null;
  const username = session?.user?.username ?? null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <Logo />

          {username && <NavLinks username={username} />}

          <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden max-w-xs min-w-0 flex-1 sm:block lg:hidden xl:block">
              <SearchTrigger />
            </div>
            <PaletteButton
              aria-label="Search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:hidden lg:flex xl:hidden"
            >
              <Search size={18} />
            </PaletteButton>

            {session?.user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <PaletteButton
                  mode="log"
                  className="hidden items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground shadow-md shadow-accent/20 transition-opacity hover:opacity-90 lg:flex"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  Log
                </PaletteButton>
                <MessagesLink />
                <NotificationBell />
                <UserMenu
                  trigger={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-medium uppercase text-accent ring-1 ring-border transition-shadow hover:ring-accent">
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
                  }
                >
                  <div className="px-2.5 pb-2 pt-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user?.name || session.user.username}
                    </p>
                    <p className="truncate text-xs text-muted">@{session.user.username}</p>
                  </div>
                  <div className="my-1 border-t border-border" />
                  {[
                    { href: `/u/${session.user.username}`, label: "Profile", icon: UserRound },
                    { href: `/u/${session.user.username}/diary`, label: "Journal", icon: BookOpen },
                    { href: `/u/${session.user.username}/lists`, label: "Lists", icon: ListMusic },
                    { href: `/u/${session.user.username}/year`, label: "Year in review", icon: PartyPopper },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={menuItem}>
                      <Icon size={15} className="text-muted" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border" />
                  {[
                    { href: "/releases", label: "Release calendar", icon: CalendarDays },
                    { href: "/guides", label: "Genre guides", icon: Compass },
                    { href: "/settings", label: "Settings", icon: Settings },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={menuItem}>
                      <Icon size={15} className="text-muted" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <LogoutButton />
                </UserMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">
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
      </header>
      {username && <MobileNav username={username} />}
      <CommandPalette username={username} />
    </>
  );
}
