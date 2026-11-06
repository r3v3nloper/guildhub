/** Addresses of a gallery picture; the route checks who may see it (SPEC 7.6). */
export function galleryImageUrl(imageId: number): string {
  return `/galerie/${imageId}/bild`;
}

export function galleryPreviewUrl(imageId: number): string {
  return `/galerie/${imageId}/bild?vorschau`;
}
