"use client";

import { useState } from "react";
import type { GalleryImageView } from "@/lib/gallery/gallery";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryTile } from "./GalleryTile";

/** The pictures as a grid; a click opens one large to page through all of them. */
export function GalleryGrid({
  images,
  showDungeon,
  emptyText,
}: {
  images: GalleryImageView[];
  /** Links each picture to its dungeon page, for the general gallery. */
  showDungeon: boolean;
  emptyText: string;
}) {
  const [openIndex, setOpenIndex] = useState<number>();

  if (images.length === 0) {
    return (
      <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
        {images.map((image, index) => (
          <GalleryTile
            key={image.id}
            image={image}
            showDungeon={showDungeon}
            onOpen={() => setOpenIndex(index)}
          />
        ))}
      </div>
      <GalleryLightbox
        images={images}
        openIndex={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(undefined)}
      />
    </>
  );
}
