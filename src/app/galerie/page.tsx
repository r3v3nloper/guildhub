import type { Metadata } from "next";
import { DungeonImagesToggle } from "@/components/gallery/DungeonImagesToggle";
import { GallerySection } from "@/components/gallery/GallerySection";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listGalleryImages } from "@/lib/gallery/gallery";
import { readDungeonImagesShown } from "@/lib/gallery/gallery-filter";
import { formatIsoDate } from "@/i18n/format";
import { de } from "@/i18n/de";
import { uploadGalleryImageAction } from "./actions";

export const metadata: Metadata = { title: de.gallery.title };

/**
 * The general gallery (SPEC 7.6): every picture the member may see. The game switcher does
 * not apply, since general pictures belong to no game.
 */
async function GalleryContent() {
  const actor = await requireActor();
  const includeDungeons = await readDungeonImagesShown();
  const images = listGalleryImages(getDb(), actor, { includeDungeons });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={de.gallery.title}
        meta={<p className="text-sm text-muted">{de.gallery.intro}</p>}
        actions={<DungeonImagesToggle shown={includeDungeons} />}
      />
      <GallerySection
        images={images}
        uploadAction={uploadGalleryImageAction.bind(null, undefined)}
        today={formatIsoDate(new Date())}
        showDungeon
        emptyText={includeDungeons ? de.gallery.empty : de.gallery.emptyHidden}
      />
    </div>
  );
}

export default function GalleryPage() {
  return (
    <PageSuspense>
      <GalleryContent />
    </PageSuspense>
  );
}
