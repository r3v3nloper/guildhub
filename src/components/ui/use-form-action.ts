"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";
import type { ActionState } from "@/lib/actions/action-state";

/**
 * Like useActionState, but keeps the user's input when the action reports errors.
 * `<form action={fn}>` makes React reset all uncontrolled fields after every submit,
 * including failed validations; submitting through onSubmit avoids that, and the form
 * is cleared only on success when `resetOnSuccess` is set.
 */
export function useFormAction(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  {
    resetOnSuccess = false,
    onSuccess,
  }: {
    resetOnSuccess?: boolean;
    /** Clears state the native reset cannot reach, e.g. controlled selects. */
    onSuccess?: () => void;
  } = {},
) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
    // onSuccess is a fresh closure per render; only a new result should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, resetOnSuccess]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return { state, pending, formRef, onSubmit };
}
