"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions/action-state";
import { FormMessage } from "./ui";

/** A form bound to a server action that reports success or failure inline. */
export function ActionForm({
  action,
  children,
  className = "flex flex-wrap items-end gap-2",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className={className}>{children}</div>
      <FormMessage state={state} />
    </form>
  );
}
