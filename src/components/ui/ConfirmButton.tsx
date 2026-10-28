"use client";

import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import type { ReactNode } from "react";
import { Button } from "./ui";

/** Button that asks before an irreversible action, then submits its form. */
export function ConfirmButton({
  question,
  children,
  variant = "danger",
}: {
  question: string;
  children: ReactNode;
  variant?: "danger" | "secondary";
}) {
  return (
    <>
      <ConfirmPopup />
      <Button
        type="button"
        variant={variant}
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
