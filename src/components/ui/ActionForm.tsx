"use client";

import type { ReactNode } from "react";
import type { ActionState } from "@/lib/actions/action-state";
import { FormMessage } from "./ui";
import { useFormAction } from "./use-form-action";

/**
 * A form bound to a server action that reports success or failure inline. Input stays
 * on errors and is cleared after success.
 */
export function ActionForm({
  action,
  children,
  className = "flex flex-wrap items-end gap-2",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const { state, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
  });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-1">
      <div className={className}>{children}</div>
      <FormMessage state={state} />
    </form>
  );
}
