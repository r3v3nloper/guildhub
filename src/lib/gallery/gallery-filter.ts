import { cookies } from "next/headers";

/**
 * "Dungeon-Bilder anzeigen" in the general gallery (SPEC 7.6), remembered per browser like
 * the game switcher. Only the hidden state is stored; without the cookie it is on.
 */
export const GALLERY_DUNGEONS_COOKIE = "guildhub-gallery-dungeons";
export const GALLERY_DUNGEONS_HIDDEN = "hidden";

export async function readDungeonImagesShown(): Promise<boolean> {
  const value = (await cookies()).get(GALLERY_DUNGEONS_COOKIE)?.value;
  return value !== GALLERY_DUNGEONS_HIDDEN;
}
