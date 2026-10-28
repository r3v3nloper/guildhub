"use client";

import { useRouter } from "next/navigation";
import { Menu } from "primereact/menu";
import { useRef } from "react";
import { Button } from "@/components/ui/ui";

export interface MoreMenuLink {
  href: string;
  label: string;
  icon: string;
}

/** Secondary pages behind one button, so the header stays one line on phones. */
export function MoreMenu({
  label,
  links,
}: {
  label: string;
  links: MoreMenuLink[];
}) {
  const menu = useRef<Menu>(null);
  const router = useRouter();

  return (
    <>
      <Menu
        ref={menu}
        popup
        popupAlignment="right"
        id="more-menu"
        model={links.map((link) => ({
          label: link.label,
          icon: `pi ${link.icon}`,
          url: link.href,
          command: (event) => {
            event.originalEvent.preventDefault();
            router.push(link.href);
          },
        }))}
      />
      <Button
        type="button"
        variant="secondary"
        icon="pi pi-bars"
        label={label}
        aria-controls="more-menu"
        aria-haspopup
        onClick={(event) => menu.current?.toggle(event)}
      />
    </>
  );
}
