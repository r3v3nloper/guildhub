"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { flagArg, idArg, parseArg } from "@/lib/actions/action-args";
import {
  formText,
  guarded,
  type ActionState,
} from "@/lib/actions/action-state";
import { revalidatePages, runMutation } from "@/lib/actions/mutation";
import { PAGE_GROUPS } from "@/lib/actions/page-groups";
import { actorForAction } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import {
  addGalleryImage,
  deleteGalleryImage,
  getOwnGalleryImage,
  updateGalleryImage,
  type GalleryDetails,
} from "@/lib/gallery/gallery";
import {
  GALLERY_DUNGEONS_COOKIE,
  GALLERY_DUNGEONS_HIDDEN,
} from "@/lib/gallery/gallery-filter";
import { getImageStore } from "@/lib/gallery/image-store";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function detailsOf(formData: FormData): GalleryDetails {
  return {
    caption: formText(formData, "caption"),
    takenOn: formText(formData, "takenOn"),
  };
}

/** Adds to the general gallery without `checklistId`, otherwise to that dungeon page. */
export async function uploadGalleryImageAction(
  checklistId: number | undefined,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const state = await guarded(async () => {
    const file = formData.get("image");
    const result = await addGalleryImage(
      getDb(),
      getImageStore(),
      await actorForAction(),
      {
        ...detailsOf(formData),
        upload: file instanceof File ? file : undefined,
        checklistId:
          checklistId === undefined ? undefined : parseArg(idArg, checklistId),
      },
    );
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePages(PAGE_GROUPS.gallery);
  }
  return state;
}

/** Where a picture is shown: its dungeon page, or the general gallery. */
function galleryPageOf(checklistId: number | null): string {
  return checklistId === null ? "/galerie" : `/dungeons/${checklistId}`;
}

/** Saves caption and date, then returns to where the picture is shown. */
export async function updateGalleryImageAction(
  imageId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let back = "/galerie";
  const state = await guarded(async () => {
    const db = getDb();
    const actor = await actorForAction();
    const id = parseArg(idArg, imageId);
    back = galleryPageOf(getOwnGalleryImage(db, actor, id).checklistId);
    const result = updateGalleryImage(db, actor, id, detailsOf(formData));
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  });
  if (state.ok) {
    revalidatePages(PAGE_GROUPS.gallery);
    redirect(back);
  }
  return state;
}

export async function deleteGalleryImageAction(
  imageId: number,
): Promise<ActionState> {
  return runMutation(PAGE_GROUPS.gallery, (db, actor) =>
    deleteGalleryImage(db, getImageStore(), actor, parseArg(idArg, imageId)),
  );
}

/** Delete from the edit page, then back to where the picture was shown. */
export async function deleteGalleryImageAndReturnAction(
  imageId: number,
): Promise<ActionState> {
  let back = "/galerie";
  const state = await guarded(async () => {
    const db = getDb();
    const actor = await actorForAction();
    const id = parseArg(idArg, imageId);
    back = galleryPageOf(getOwnGalleryImage(db, actor, id).checklistId);
    deleteGalleryImage(db, getImageStore(), actor, id);
    return { ok: true };
  });
  if (state.ok) {
    revalidatePages(PAGE_GROUPS.gallery);
    redirect(back);
  }
  return state;
}

export async function setDungeonImagesShownAction(
  shown: boolean,
): Promise<void> {
  const store = await cookies();
  if (parseArg(flagArg, shown)) {
    store.delete(GALLERY_DUNGEONS_COOKIE);
  } else {
    store.set(GALLERY_DUNGEONS_COOKIE, GALLERY_DUNGEONS_HIDDEN, {
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  }
  revalidatePages(["/galerie"]);
}
