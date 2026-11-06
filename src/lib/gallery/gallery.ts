import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DateTime } from "luxon";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { checklists, galleryImages, users } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { visibleChecklist } from "@/lib/lists/checklists";
import { visibleToFilter } from "@/lib/lists/visible-entries";
import { GALLERY_CAPTION_MAX, GALLERY_MAX_BYTES } from "./gallery-limits";
import { prepareImage } from "./image-processing";
import type { ImageStore, ImageVariant } from "./image-store";

export type GalleryImageRow = typeof galleryImages.$inferSelect;

export interface GalleryImageView {
  id: number;
  caption: string | null;
  takenOn: string;
  width: number;
  height: number;
  uploaderName: string | null;
  /** The dungeon page the picture belongs to; null in the general gallery. */
  checklist: { id: number; name: string } | null;
  /** Caption and date: the uploader only. */
  canEdit: boolean;
  canDelete: boolean;
}

/** What to show: one dungeon page, or the general gallery with or without dungeon pictures. */
export type GalleryScope =
  { checklistId: number } | { includeDungeons: boolean };

/** An uploaded file before it is read; File from FormData fits as it is. */
export interface GalleryUpload {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface GalleryDetails {
  caption: string;
  /** YYYY-MM-DD. */
  takenOn: string;
}

export interface GalleryUploadInput extends GalleryDetails {
  /** Missing when no file was chosen. */
  upload: GalleryUpload | undefined;
  /** The dungeon page to add to; undefined for the general gallery. */
  checklistId: number | undefined;
}

export type GalleryErrors = Partial<
  Record<"upload" | "caption" | "takenOn", string>
>;

export type GalleryResult =
  { ok: true; id: number } | { ok: false; errors: GalleryErrors };

/**
 * Pictures the actor may see, the latest day first (SPEC 7.6). Pictures of a dungeon page
 * share its visibility, so those of someone else's private page never show.
 */
export function listGalleryImages(
  db: AppDatabase,
  actor: Actor,
  scope: GalleryScope,
): GalleryImageView[] {
  assertAllowed(permissions.viewGuild(actor));
  const rows = db
    .select({
      image: galleryImages,
      uploaderName: users.name,
      checklistName: checklists.name,
    })
    .from(galleryImages)
    .leftJoin(users, eq(users.id, galleryImages.uploadedBy))
    .leftJoin(checklists, eq(checklists.id, galleryImages.checklistId))
    .where(scopeFilter(db, actor, scope))
    .orderBy(desc(galleryImages.takenOn), desc(galleryImages.id))
    .all();
  return rows.map(({ image, uploaderName, checklistName }) => ({
    id: image.id,
    caption: image.caption,
    takenOn: image.takenOn,
    width: image.width,
    height: image.height,
    uploaderName,
    checklist:
      image.checklistId !== null && checklistName !== null
        ? { id: image.checklistId, name: checklistName }
        : null,
    canEdit: image.uploadedBy === actor.userId,
    canDelete: permissions.deleteGalleryImage(actor, image.uploadedBy).allowed,
  }));
}

function scopeFilter(db: AppDatabase, actor: Actor, scope: GalleryScope) {
  if ("checklistId" in scope) {
    visibleChecklist(db, actor, scope.checklistId);
    return eq(galleryImages.checklistId, scope.checklistId);
  }
  if (!scope.includeDungeons) {
    return isNull(galleryImages.checklistId);
  }
  const visiblePages = db
    .select({ id: checklists.id })
    .from(checklists)
    .where(visibleToFilter(checklists, actor.userId));
  return or(
    isNull(galleryImages.checklistId),
    inArray(galleryImages.checklistId, visiblePages),
  );
}

/** Stores the shrunk picture and its preview, then records it. */
export async function addGalleryImage(
  db: AppDatabase,
  store: ImageStore,
  actor: Actor,
  input: GalleryUploadInput,
): Promise<GalleryResult> {
  assertAllowed(permissions.viewGuild(actor));
  if (input.checklistId !== undefined) {
    visibleChecklist(db, actor, input.checklistId);
  }
  const details = parseDetails(input);
  const errors: GalleryErrors = details.ok ? {} : { ...details.errors };
  const uploadError = checkUpload(input.upload);
  if (uploadError) {
    errors.upload = uploadError;
  }
  if (!details.ok || uploadError || !input.upload) {
    return { ok: false, errors };
  }

  const prepared = await prepareImage(
    new Uint8Array(await input.upload.arrayBuffer()),
  );
  if (!prepared) {
    return {
      ok: false,
      errors: { upload: "Bitte ein Bild als JPEG, PNG oder WebP wählen." },
    };
  }
  const file = crypto.randomUUID();
  store.write(file, "image", prepared.image);
  store.write(file, "preview", prepared.preview);
  try {
    const id = db
      .insert(galleryImages)
      .values({
        ...details.values,
        uploadedBy: actor.userId,
        checklistId: input.checklistId ?? null,
        file,
        width: prepared.width,
        height: prepared.height,
      })
      .returning()
      .get().id;
    return { ok: true, id };
  } catch (error) {
    store.remove([file]);
    throw error;
  }
}

/** A picture whose caption and date the actor may change: only their own. */
export function getOwnGalleryImage(
  db: AppDatabase,
  actor: Actor,
  imageId: number,
): GalleryImageRow {
  const image = visibleImage(db, actor, imageId);
  assertAllowed(permissions.editOwnData(actor, image.uploadedBy));
  return image;
}

export function updateGalleryImage(
  db: AppDatabase,
  actor: Actor,
  imageId: number,
  input: GalleryDetails,
): GalleryResult {
  const image = getOwnGalleryImage(db, actor, imageId);
  const details = parseDetails(input);
  if (!details.ok) {
    return details;
  }
  db.update(galleryImages)
    .set(details.values)
    .where(eq(galleryImages.id, image.id))
    .run();
  return { ok: true, id: image.id };
}

/** Removes a picture with its files; an officer removing someone else's leaves an audit entry. */
export function deleteGalleryImage(
  db: AppDatabase,
  store: ImageStore,
  actor: Actor,
  imageId: number,
): void {
  const image = visibleImage(db, actor, imageId);
  assertAllowed(permissions.deleteGalleryImage(actor, image.uploadedBy));
  db.delete(galleryImages).where(eq(galleryImages.id, image.id)).run();
  store.remove([image.file]);
  if (image.uploadedBy !== actor.userId) {
    recordAudit(
      db,
      actor.userId,
      "galleryImage.delete",
      image.caption ?? `Bild ${image.id}`,
      { imageId: image.id, uploadedBy: image.uploadedBy },
    );
  }
}

/** The file behind a picture, only for those who may see the picture. */
export function readGalleryImage(
  db: AppDatabase,
  store: ImageStore,
  actor: Actor,
  imageId: number,
  variant: ImageVariant,
): Buffer {
  const image = visibleImage(db, actor, imageId);
  const content = store.read(image.file, variant);
  if (!content) {
    throw new NotFoundError("Bild");
  }
  return content;
}

/**
 * Runs a deletion that takes gallery rows along by cascade (a dungeon page, a purged
 * member) and then removes their files, which no foreign key reaches.
 */
export function deleteWithGalleryFiles(
  db: AppDatabase,
  store: ImageStore,
  owner: { checklistId: number } | { uploadedBy: string },
  deletion: () => void,
): void {
  const files = db
    .select({ file: galleryImages.file })
    .from(galleryImages)
    .where(
      "checklistId" in owner
        ? eq(galleryImages.checklistId, owner.checklistId)
        : eq(galleryImages.uploadedBy, owner.uploadedBy),
    )
    .all()
    .map((row) => row.file);
  // A refused deletion throws here and leaves the files in place.
  deletion();
  store.remove(files);
}

function visibleImage(
  db: AppDatabase,
  actor: Actor,
  imageId: number,
): GalleryImageRow {
  assertAllowed(permissions.viewGuild(actor));
  const image = db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.id, imageId))
    .get();
  if (!image) {
    throw new NotFoundError("Bild");
  }
  if (image.checklistId !== null) {
    const page = db
      .select({ id: checklists.id })
      .from(checklists)
      .where(
        and(
          eq(checklists.id, image.checklistId),
          visibleToFilter(checklists, actor.userId),
        ),
      )
      .get();
    if (!page) {
      throw new NotFoundError("Bild");
    }
  }
  return image;
}

function checkUpload(upload: GalleryUpload | undefined): string | undefined {
  if (!upload || upload.size === 0) {
    return "Bitte ein Bild auswählen.";
  }
  if (upload.size > GALLERY_MAX_BYTES) {
    return `Das Bild ist zu groß, höchstens ${GALLERY_MAX_BYTES / 1024 / 1024} MB.`;
  }
  return undefined;
}

function parseDetails(
  input: GalleryDetails,
):
  | { ok: true; values: Pick<GalleryImageRow, "caption" | "takenOn"> }
  | { ok: false; errors: GalleryErrors } {
  const errors: GalleryErrors = {};
  const caption = input.caption.trim().replace(/\s+/g, " ");
  if (caption.length > GALLERY_CAPTION_MAX) {
    errors.caption = `Höchstens ${GALLERY_CAPTION_MAX} Zeichen.`;
  }
  const takenOn = input.takenOn.trim();
  if (!isIsoDay(takenOn)) {
    errors.takenOn = "Bitte ein gültiges Datum angeben.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, values: { caption: caption || null, takenOn } };
}

function isIsoDay(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    DateTime.fromISO(value, { zone: "utc" }).isValid
  );
}
