"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/actions/action-state";

/**
 * Runs a server action optimistically (SPEC 7.1): the optimistic update is applied
 * inside the transition, React rolls it back when the action fails, and the message
 * explains why.
 */
export function useOptimisticAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (
    action: () => Promise<ActionState>,
    applyOptimistic?: () => void,
  ) => {
    startTransition(async () => {
      applyOptimistic?.();
      const result = await action();
      setError(result.ok ? undefined : result.message);
    });
  };

  return { pending, error, run };
}
