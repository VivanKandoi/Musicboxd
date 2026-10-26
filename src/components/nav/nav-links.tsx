"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, BookOpen, Users, UserRound } from "lucide-react";

function navItems(username: string) {
  return [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/discover", label: "Discover", icon: Sparkles, match: (p: string) => p.startsWith("/discover") || p.startsWith("/guides") },
    {
      href: `/u/${username}/diary`,
      label: "Journal",
      icon: BookOpen,
      match: (p: string) => p.endsWith("/diary"),
    },
    { href: "/community", label: "Community", icon: Users, match: (p: string) => p.startsWith("/community") },
    {
      href: `/u/${username}`,
      label: "Profile",
      icon: UserRound,
      match: (p: string) => p === `/u/${username}`,
    },
  ];
}

export function NavLinks({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 lg:flex">
      {navItems(username).map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 border-b-2 pb-1 pt-1 text-sm font-medium transition-colors ${
              active
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon size={15} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Bottom tab bar for phones and tablets, where the top links are hidden.
export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-lg justify-around">
        {navItems(username).map((link) => {
          const active = link.match(pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-16 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon size={19} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
