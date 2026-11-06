"use client";

import { Field, TextInput } from "@/components/ui/ui";
import { GALLERY_CAPTION_MAX } from "@/lib/gallery/gallery-limits";
import { de } from "@/i18n/de";

/** Caption and day of a picture, shared by the upload and the edit form. */
export function GalleryDetailsFields({
  caption,
  takenOn,
  errors,
}: {
  caption: string;
  /** YYYY-MM-DD. */
  takenOn: string;
  errors: Record<string, string | undefined>;
}) {
  return (
    <>
      <Field
        label={de.gallery.fieldCaption}
        error={errors.caption}
        hint={de.gallery.fieldCaptionHint}
      >
        <TextInput
          name="caption"
          defaultValue={caption}
          maxLength={GALLERY_CAPTION_MAX}
        />
      </Field>
      <Field
        label={de.gallery.fieldTakenOn}
        error={errors.takenOn}
        hint={de.gallery.fieldTakenOnHint}
      >
        <TextInput name="takenOn" type="date" defaultValue={takenOn} required />
      </Field>
    </>
  );
}
