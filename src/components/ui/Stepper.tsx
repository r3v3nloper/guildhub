"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/actions/action-state";
import { useOptimisticAction } from "./use-optimistic-action";
import { Button } from "./ui";
import { de } from "@/i18n/de";

/** Saves once the clicking or typing pauses, so ten quick clicks are one request. */
const SAVE_DELAY_MS = 600;

/**
 * A number with −/+ that saves itself. Typing works too, for big jumps; a value outside
 * the bounds is not saved.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  onSave,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onSave: (value: number) => Promise<ActionState>;
}) {
  const [text, setText] = useState(value?.toString() ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { pending, error, run } = useOptimisticAction();

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    const number = Number(next);
    if (
      next === "" ||
      !Number.isInteger(number) ||
      number < min ||
      number > max
    ) {
      return;
    }
    timer.current = setTimeout(() => run(() => onSave(number)), SAVE_DELAY_MS);
  };
  const step = (delta: 1 | -1) => {
    // From an empty field, + starts at 1 (or the minimum, if higher): a first click
    // that only reaches 0 would look like it did nothing.
    const next = text === "" ? Math.max(min, 1) : Number(text) + delta;
    schedule(String(Math.max(min, Math.min(max, next))));
  };

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          icon="pi pi-minus"
          aria-label={de.stepper.decrease(label)}
          disabled={text === "" || Number(text) <= min}
          onClick={() => step(-1)}
        />
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          aria-label={label}
          aria-busy={pending}
          onChange={(event) => schedule(event.target.value)}
          className="h-10 w-16 rounded-xl border border-border bg-raised text-center tabular-nums [appearance:textfield] focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="secondary"
          icon="pi pi-plus"
          aria-label={de.stepper.increase(label)}
          disabled={text !== "" && Number(text) >= max}
          onClick={() => step(1)}
        />
      </span>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
