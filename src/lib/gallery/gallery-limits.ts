/** Upload limit per picture (SPEC 7.6); the action body limit in next.config.ts leaves room above it. */
export const GALLERY_MAX_BYTES = 10 * 1024 * 1024;

export const GALLERY_CAPTION_MAX = 200;

/** Longer edge of a stored picture; smaller ones keep their size (SPEC 7.6). */
export const GALLERY_LONG_EDGE = 2560;

/** Longer edge of the preview in the grid; enough for two columns on a retina phone. */
export const GALLERY_PREVIEW_EDGE = 640;

/** What the file input offers; the server checks the actual content, not this list. */
export const GALLERY_ACCEPT = "image/jpeg,image/png,image/webp";
