import type { Metadata } from "next";
import { GalleryImageForm } from "@/components/gallery/GalleryImageForm";
import { galleryPreviewUrl } from "@/components/gallery/gallery-urls";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { FormPage } from "@/components/ui/FormPage";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { getOwnGalleryImage } from "@/lib/gallery/gallery";
import { idParam, orNotFound } from "@/lib/not-found";
import { de } from "@/i18n/de";
import {
  deleteGalleryImageAndReturnAction,
  updateGalleryImageAction,
} from "../actions";

export const metadata: Metadata = { title: de.gallery.edit };

/** Caption and day of one's own picture; back to where it is shown. */
async function EditGalleryImageContent({ params }: PageProps<"/galerie/[id]">) {
  const actor = await requireActor();
  const imageId = await idParam(params);
  const image = orNotFound(() => getOwnGalleryImage(getDb(), actor, imageId));
  const backHref =
    image.checklistId === null ? "/galerie" : `/dungeons/${image.checklistId}`;

  return (
    <FormPage
      backHref={backHref}
      backLabel={de.common.back}
      title={de.gallery.edit}
      danger={{
        title: de.gallery.deleteTitle,
        text: de.gallery.deleteHint,
        action: (
          <ActionForm
            action={deleteGalleryImageAndReturnAction.bind(null, image.id)}
          >
            <ConfirmButton
              question={de.gallery.deleteConfirm}
              variant="danger"
              text
            >
              {de.common.delete}
            </ConfirmButton>
          </ActionForm>
        ),
      }}
    >
      <div className="flex flex-col gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- private route behind the session */}
        <img
          src={galleryPreviewUrl(image.id)}
          alt=""
          className="max-h-64 w-fit rounded-[18px] border border-border object-contain"
        />
        <GalleryImageForm
          action={updateGalleryImageAction.bind(null, image.id)}
          caption={image.caption ?? ""}
          takenOn={image.takenOn}
          cancelHref={backHref}
        />
      </div>
    </FormPage>
  );
}

export default function EditGalleryImagePage(
  props: PageProps<"/galerie/[id]">,
) {
  return (
    <PageSuspense>
      <EditGalleryImageContent {...props} />
    </PageSuspense>
  );
}
