/** Who sees an entry a member created: only the author, or the whole guild. */
export const VISIBILITIES = ["private", "guild"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
