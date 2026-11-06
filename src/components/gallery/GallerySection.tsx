import { FoldCard } from "@/components/lists/FoldCard";
import type { ActionState } from "@/lib/actions/action-state";
import type { GalleryImageView } from "@/lib/gallery/gallery";
import { de } from "@/i18n/de";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryUploadForm } from "./GalleryUploadForm";

/** Upload (folded away) above the grid; the general gallery and dungeon pages share it. */
export function GallerySection({
  images,
  uploadAction,
  today,
  showDungeon,
  emptyText,
}: {
  images: GalleryImageView[];
  uploadAction: (
    state: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  today: string;
  showDungeon: boolean;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FoldCard title={de.gallery.upload}>
        <GalleryUploadForm action={uploadAction} today={today} />
      </FoldCard>
      <GalleryGrid
        images={images}
        showDungeon={showDungeon}
        emptyText={emptyText}
      />
    </div>
  );
}
