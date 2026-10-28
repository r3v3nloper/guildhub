"use client";

import { useRouter } from "next/navigation";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { useRef } from "react";
import { Button } from "@/components/ui/ui";

export interface MoreMenuLink {
  href: string;
  label: string;
  icon: string;
}

/** A labelled block of links inside the menu. */
export interface MoreMenuGroup {
  label: string;
  links: MoreMenuLink[];
}

/**
 * Pages behind one button. On desktop it holds the secondary pages; on phones every
 * page plus sign-out, so the header stays on one line.
 */
export function MoreMenu({
  id,
  label,
  groups,
  compact = false,
  signOut,
  signOutLabel,
}: {
  id: string;
  label: string;
  groups: MoreMenuGroup[];
  /** Icon-only button, `label` becomes its accessible name. */
  compact?: boolean;
  signOut?: () => Promise<void>;
  signOutLabel?: string;
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
  if (signOut) {
    items.push(
      { separator: true },
      {
        label: signOutLabel,
        icon: "pi pi-sign-out",
        command: () => void signOut(),
      },
    );
  }

  return (
    <>
      <Menu ref={menu} popup popupAlignment="right" id={id} model={items} />
      <Button
        type="button"
        variant="secondary"
        icon="pi pi-bars"
        label={compact ? undefined : label}
        aria-label={compact ? label : undefined}
        aria-controls={id}
        aria-haspopup
        onClick={(event) => menu.current?.toggle(event)}
      />
    </>
  );
}
