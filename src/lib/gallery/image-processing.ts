import sharp, { type ResizeOptions } from "sharp";
import { GALLERY_LONG_EDGE, GALLERY_PREVIEW_EDGE } from "./gallery-limits";

const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

/** A picture ready to store: the shown image, its grid preview and the shown size. */
export interface PreparedImage {
  image: Buffer;
  preview: Buffer;
  width: number;
  height: number;
}

/**
 * Shrinks an upload to at most GALLERY_LONG_EDGE and re-encodes it as WebP (SPEC 7.6).
 * Re-encoding also drops EXIF data such as GPS positions; the orientation is applied
 * first so phone photos stay upright. Undefined when the bytes are no JPEG, PNG or WebP,
 * whatever the file name or the browser claimed.
 */
export async function prepareImage(
  bytes: Uint8Array,
): Promise<PreparedImage | undefined> {
  if (!(await hasAcceptedFormat(bytes))) {
    return undefined;
  }
  const source = sharp(bytes).rotate();
  const { data, info } = await source
    .clone()
    .resize(withinSquare(GALLERY_LONG_EDGE))
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const preview = await source
    .clone()
    .resize(withinSquare(GALLERY_PREVIEW_EDGE))
    .webp({ quality: 75 })
    .toBuffer();
  return { image: data, preview, width: info.width, height: info.height };
}

async function hasAcceptedFormat(bytes: Uint8Array): Promise<boolean> {
  try {
    const { format } = await sharp(bytes).metadata();
    return format !== undefined && ACCEPTED_FORMATS.has(format);
  } catch {
    return false;
  }
}

function withinSquare(edge: number): ResizeOptions {
  return {
    width: edge,
    height: edge,
    fit: "inside",
    withoutEnlargement: true,
  };
}
