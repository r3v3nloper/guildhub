import Link from "next/link";

export interface ViewTab {
  key: string;
  href: string;
  label: string;
  /** Shown as a pill beside the label. */
  count?: number;
}

/**
 * Views of one page as links (the view lives in the URL, so it survives reloads and
 * can be shared). Scrolls sideways on narrow screens instead of wrapping.
 */
export function ViewTabs({
  label,
  tabs,
  active,
}: {
  /** Accessible name of the navigation, e.g. "Ansicht". */
  label: string;
  tabs: readonly ViewTab[];
  active: string;
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm sm:px-3.5 sm:text-[14.5px] ${
              isActive
                ? "font-bold text-white shadow-[inset_0_-3px_0_var(--gh-accent)]"
                : "font-semibold text-muted hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                  isActive ? "bg-accent text-on-accent" : "bg-chip text-soft"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
