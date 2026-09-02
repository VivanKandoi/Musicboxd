"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Search, BookOpen, Users, UserRound } from "lucide-react";

export function NavLinks({ username }: { username: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/discover", label: "Discover", icon: Sparkles, match: (p: string) => p.startsWith("/discover") },
    { href: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
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

  return (
    <nav className="hidden items-center gap-6 lg:flex">
      {links.map((link) => {
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
