import { currentActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { readGalleryImage } from "@/lib/gallery/gallery";
import { getImageStore } from "@/lib/gallery/image-store";

/**
 * Serves a gallery picture, `?vorschau` its grid preview, only to members who may see it
 * (SPEC 7.6). Anything else gets a plain 404, so the address reveals nothing.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/galerie/[id]/bild">,
) {
  const actor = await currentActor();
  const imageId = Number((await params).id);
  if (!actor || !Number.isInteger(imageId) || imageId <= 0) {
    return notFound();
  }
  const variant = new URL(request.url).searchParams.has("vorschau")
    ? "preview"
    : "image";
  try {
    const content = readGalleryImage(
      getDb(),
      getImageStore(),
      actor,
      imageId,
      variant,
    );
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "image/webp",
        // A picture never changes under its ID; "private" keeps it out of shared caches.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return notFound();
    }
    throw error;
  }
}

function notFound(): Response {
  return new Response(null, { status: 404 });
}
