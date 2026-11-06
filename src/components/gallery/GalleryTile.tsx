"use client";

import Link from "next/link";
import { RequestMenu } from "@/components/guild/RequestMenu";
import type { GalleryImageView } from "@/lib/gallery/gallery";
import { formatIsoDay } from "@/i18n/format";
import { de } from "@/i18n/de";
import { deleteGalleryImageAction } from "@/app/galerie/actions";
import { galleryPreviewUrl } from "./gallery-urls";

/** One picture in the grid: preview, caption, day and uploader, its dungeon if wanted. */
export function GalleryTile({
  image,
  showDungeon,
  onOpen,
}: {
  image: GalleryImageView;
  showDungeon: boolean;
  onOpen: () => void;
}) {
  const day = formatIsoDay(image.takenOn);

  return (
    <figure className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={de.gallery.open(image.caption)}
        className="block aspect-[4/3] overflow-hidden rounded-[18px] border border-border bg-raised focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private route behind the session; next/image would cache it in its shared optimizer */}
        <img
          src={galleryPreviewUrl(image.id)}
          alt={de.gallery.imageAlt(image.caption, day)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.03]"
        />
      </button>
      <figcaption className="flex items-start justify-between gap-2 px-1">
        <span className="flex min-w-0 flex-col gap-0.5">
          {image.caption && (
            <span className="text-sm font-semibold break-words text-white">
              {image.caption}
            </span>
          )}
          <span className="text-[12.5px] text-muted">
            {de.gallery.byline(image.uploaderName, day)}
          </span>
          {showDungeon && image.checklist && (
            <Link
              href={`/dungeons/${image.checklist.id}`}
              className="w-fit text-[12.5px] font-semibold text-soft hover:text-white"
            >
              <i className="pi pi-flag mr-1 text-[11px]" aria-hidden />
              {de.gallery.fromDungeon(image.checklist.name)}
            </Link>
          )}
        </span>
        {image.canDelete && (
          <RequestMenu
            label={de.gallery.menuFor(image.caption)}
            question={de.gallery.deleteConfirm}
            editHref={image.canEdit ? `/galerie/${image.id}` : undefined}
            onDelete={deleteGalleryImageAction.bind(null, image.id)}
          />
        )}
      </figcaption>
    </figure>
  );
}
