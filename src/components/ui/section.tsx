import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "See all",
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          {Icon && <Icon size={17} className="text-accent" />}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-accent"
        >
          {linkLabel}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 text-center ${
        compact ? "px-4 py-6" : "px-6 py-10"
      }`}
    >
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon size={20} />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <div className="max-w-sm text-xs text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const buttonPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-md shadow-accent/20 transition-opacity hover:opacity-90";
export const buttonSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent";
