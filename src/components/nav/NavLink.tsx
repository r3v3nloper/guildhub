"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkProps {
  href: string;
  label: string;
  icon: string;
  /** Small count next to the label, e.g. requests waiting for the user. */
  badge?: number;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** One entry of the desktop sidebar; highlights itself on its page and sub-pages. */
export function SidebarLink({ href, label, icon, badge }: NavLinkProps) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
        active
          ? "bg-accent-soft font-semibold text-white"
          : "font-medium text-soft hover:bg-raised hover:text-white"
      }`}
    >
      <i
        className={`pi ${icon} text-base ${active ? "text-accent-strong" : ""}`}
        aria-hidden
      />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
            active ? "bg-accent text-on-accent" : "bg-chip text-accent-strong"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/** One tab of the phone's bottom bar. */
export function TabLink({ href, label, icon, badge }: NavLinkProps) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] ${
        active ? "font-bold text-white" : "font-semibold text-muted"
      }`}
    >
      <span
        className={`relative flex h-7.5 w-14 items-center justify-center rounded-full ${active ? "bg-accent-soft" : ""}`}
      >
        <i
          className={`pi ${icon} text-lg ${active ? "text-accent-strong" : ""}`}
          aria-hidden
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
            {badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}
