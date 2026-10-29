"use client";

import { confirmPopup } from "primereact/confirmpopup";
import type { ReactNode } from "react";
import { Button } from "./ui";

/**
 * Button that asks before an irreversible action, then submits its form. The popup
 * itself is rendered once in PrimeProvider.
 */
export function ConfirmButton({
  question,
  children,
  variant = "danger",
  icon,
  label,
  text = false,
}: {
  question: string;
  children?: ReactNode;
  variant?: "danger" | "secondary";
  /** PrimeIcons class for an icon-only button; `label` then names it. */
  icon?: string;
  label?: string;
  /** Plain text button, for actions that should not draw the eye. */
  text?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      icon={icon}
      text={text}
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
  );
}
