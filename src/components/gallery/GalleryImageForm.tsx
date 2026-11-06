"use client";

import { Button, FormMessage } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";
import { GalleryDetailsFields } from "./GalleryDetailsFields";

/** Changes caption and day of one's own picture; the file itself stays. */
export function GalleryImageForm({
  action,
  caption,
  takenOn,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  caption: string;
  takenOn: string;
  cancelHref: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <GalleryDetailsFields
        caption={caption}
        takenOn={takenOn}
        errors={state.errors ?? {}}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{de.common.save}</Button>
        <a
          href={cancelHref}
          className="flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
        >
          {de.common.cancel}
        </a>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
