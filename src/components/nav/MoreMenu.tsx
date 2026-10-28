"use client";

import { useRouter } from "next/navigation";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { useRef } from "react";
import type { NavGroup } from "./nav-links";

/**
 * The last tab of the phone's bottom bar: every page that has no tab of its own, plus
 * sign-out.
 */
export function MoreMenu({
  id,
  label,
  groups,
  badge = 0,
  signOut,
  signOutLabel,
}: {
  id: string;
  label: string;
  groups: NavGroup[];
  /** Shown on the tab, e.g. requests waiting behind one of the menu's pages. */
  badge?: number;
  signOut: () => Promise<void>;
  signOutLabel: string;
}) {
  const menu = useRef<Menu>(null);
  const router = useRouter();
  const items: MenuItem[] = groups.map((group) => ({
    label: group.label,
    items: group.links.map((link) => ({
      label: link.label,
      icon: `pi ${link.icon}`,
      url: link.href,
      command: (event) => {
        event.originalEvent.preventDefault();
        router.push(link.href);
      },
    })),
  }));
  items.push(
    { separator: true },
    {
      label: signOutLabel,
      icon: "pi pi-sign-out",
      command: () => void signOut(),
    },
  );

  return (
    <>
      <Menu ref={menu} popup popupAlignment="right" id={id} model={items} />
      <button
        type="button"
        aria-controls={id}
        aria-haspopup
        onClick={(event) => menu.current?.toggle(event)}
        className="flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] font-semibold text-muted"
      >
        <span className="relative flex h-7.5 w-14 items-center justify-center">
          <i className="pi pi-bars text-lg" aria-hidden />
          {badge > 0 && (
            <span className="absolute -top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
              {badge}
            </span>
          )}
        </span>
        {label}
      </button>
    </>
  );
}
