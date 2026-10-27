"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, Sparkles, BookOpen, Users, UserRound, Plus } from "lucide-react";
import { openCommandPalette } from "@/components/command-palette";

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
    <nav aria-label="Main" className="hidden items-center gap-1 rounded-full border border-border bg-surface/60 p-1 lg:flex">
      {navItems(username).map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-border"
                transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              />
            )}
            <Icon size={15} className={`relative ${active ? "text-accent" : ""}`} />
            <span className="relative">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Bottom tab bar for phones and tablets, where the top links are hidden. The raised button in the
// middle is the app's main action: log a listen.
export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();
  const items = navItems(username);
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  const tab = (link: (typeof items)[number]) => {
    const active = link.match(pathname);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        {active && (
          <motion.span
            layoutId="mobile-nav-dot"
            className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
            transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
          />
        )}
        <Icon size={19} />
        {link.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-end">
        {left.map(tab)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => openCommandPalette("log")}
            aria-label="Log an album"
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
}
