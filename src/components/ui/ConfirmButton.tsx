"use client";

import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import type { ReactNode } from "react";
import { Button } from "./ui";

/** Button that asks before an irreversible action, then submits its form. */
export function ConfirmButton({
  question,
  children,
  variant = "danger",
  icon,
  label,
}: {
  question: string;
  children?: ReactNode;
  variant?: "danger" | "secondary";
  /** PrimeIcons class for an icon-only button; `label` then names it. */
  icon?: string;
  label?: string;
}) {
  return (
    <>
      <ConfirmPopup />
      <Button
        type="button"
        variant={variant}
        icon={icon}
        aria-label={label}
        title={label}
        onClick={(event) => {
          const form = event.currentTarget.form;
          confirmPopup({
            target: event.currentTarget,
            message: question,
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => form?.requestSubmit(),
          });
        }}
      >
        {children}
      </Button>
    </>
  );
}
