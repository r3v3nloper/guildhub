"use client";

import { Galleria } from "primereact/galleria";
import { useEffect, useRef } from "react";
import type { GalleryImageView } from "@/lib/gallery/gallery";
import { formatIsoDay } from "@/i18n/format";
import { de } from "@/i18n/de";
import { galleryImageUrl } from "./gallery-urls";

/**
 * A picture shown large, with caption, day and uploader; arrows and keys page through the
 * whole grid. Closed while `openIndex` is undefined.
 */
export function GalleryLightbox({
  images,
  openIndex,
  onIndexChange,
  onClose,
}: {
  images: GalleryImageView[];
  openIndex: number | undefined;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const galleria = useRef<Galleria>(null);
  const isOpen = openIndex !== undefined;

  useEffect(() => {
    if (isOpen) {
      galleria.current?.show();
    }
  }, [isOpen]);

  return (
    <Galleria
      ref={galleria}
      value={images}
      activeIndex={openIndex ?? 0}
      onItemChange={(event) => onIndexChange(event.index)}
      onHide={onClose}
      fullScreen
      circular
      showItemNavigators
      showThumbnails={false}
      item={(image: GalleryImageView) => <LightboxPicture image={image} />}
      caption={(image: GalleryImageView) => <LightboxCaption image={image} />}
      pt={{
        closeButton: { "aria-label": de.gallery.close },
        previousItemButton: { "aria-label": de.gallery.previous },
        nextItemButton: { "aria-label": de.gallery.next },
      }}
    />
  );
}

function LightboxPicture({ image }: { image: GalleryImageView }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private route behind the session
    <img
      src={galleryImageUrl(image.id)}
      alt={de.gallery.imageAlt(image.caption, formatIsoDay(image.takenOn))}
      width={image.width}
      height={image.height}
      className="block max-h-[85vh] w-auto max-w-[95vw] object-contain"
    />
  );
}

function LightboxCaption({ image }: { image: GalleryImageView }) {
  return (
    <span className="flex flex-col gap-0.5">
      {image.caption && (
        <span className="font-semibold text-white">{image.caption}</span>
      )}
      <span className="text-sm text-soft">
        {de.gallery.byline(image.uploaderName, formatIsoDay(image.takenOn))}
      </span>
    </span>
  );
}
