"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/ui";
import { de } from "@/i18n/de";
import { CraftRequestForm } from "./CraftRequestForm";

type FormProps = Omit<Parameters<typeof CraftRequestForm>[0], "onCreated">;

/**
 * "Neuer Antrag" as a button: the form only takes room while someone fills it in.
 * After sending, the page switches to the user's own requests.
 */
export function NewRequestPanel({
  credits,
  ...form
}: FormProps & {
  /** Data credits the pack requires next to its recipes. */
  credits?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <span className="flex">
        <Button
          type="button"
          icon="pi pi-plus"
          label={de.requests.new}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        />
      </span>
    );
  }
  return (
    <section
      aria-labelledby="new-request"
      className="w-full rounded-[22px] border border-[#2c2645] bg-surface p-5 md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          id="new-request"
          className="font-display text-xl font-semibold text-white"
        >
          {de.requests.new}
        </h2>
        <Button
          type="button"
          variant="secondary"
          text
          icon="pi pi-times"
          aria-label={de.requests.close}
          onClick={() => setOpen(false)}
        />
      </div>
      <CraftRequestForm
        {...form}
        onCreated={() => {
          setOpen(false);
          router.push("/antraege?ansicht=meine");
        }}
      />
      {credits && <div className="mt-4">{credits}</div>}
    </section>
  );
}
