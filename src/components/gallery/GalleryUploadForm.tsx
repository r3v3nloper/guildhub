"use client";

import { Button, Field, FormMessage } from "@/components/ui/ui";
import { useFormAction } from "@/components/ui/use-form-action";
import type { ActionState } from "@/lib/actions/action-state";
import { GALLERY_ACCEPT } from "@/lib/gallery/gallery-limits";
import { de } from "@/i18n/de";
import { GalleryDetailsFields } from "./GalleryDetailsFields";

/** Picks a picture with caption and day; the form empties itself after an upload. */
export function GalleryUploadForm({
  action,
  today,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** YYYY-MM-DD, the default day of a new picture. */
  today: string;
}) {
  const { state, pending, formRef, onSubmit } = useFormAction(action, {
    resetOnSuccess: true,
  });
  const errors = state.errors ?? {};

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label={de.gallery.fieldImage}
        error={errors.upload}
        hint={de.gallery.fieldImageHint}
      >
        <input
          name="image"
          type="file"
          accept={GALLERY_ACCEPT}
          required
          className="w-full rounded-xl border border-border bg-raised p-2 text-sm text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-chip file:px-3 file:py-1.5 file:font-semibold file:text-white"
        />
      </Field>
      <GalleryDetailsFields caption="" takenOn={today} errors={errors} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} icon="pi pi-upload" loading={pending}>
          {de.gallery.uploadSubmit}
        </Button>
        <FormMessage
          state={
            state.ok && !pending
              ? { ok: true, message: de.gallery.uploaded }
              : state
          }
        />
      </div>
    </form>
  );
}
