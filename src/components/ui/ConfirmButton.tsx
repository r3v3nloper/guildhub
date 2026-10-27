"use client";

import type { ReactNode } from "react";
import { Button } from "./ui";

/** Submit button that asks before an irreversible action. */
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
    <Button
      variant={variant}
      onClick={(event) => {
        if (!window.confirm(question)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
