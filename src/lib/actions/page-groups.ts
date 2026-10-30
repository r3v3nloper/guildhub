/**
 * Pages that show the same data, so a change refreshes all of them in one go. A path
 * with a [segment] stands for every page of that route.
 */
export const PAGE_GROUPS = {
  /** A character's level and profession skills. */
  characterStats: [
    "/",
    "/roster",
    "/berufe",
    "/charaktere",
    "/charaktere/[id]",
    "/farmspots",
  ],
  /** The stat page lists the recommendations; character pages show those of their specs. */
  specBuilds: ["/stat-prio", "/charaktere/[id]"],
  /** The stat page lists the rankings; character pages show those of their class. */
  statPriorities: ["/stat-prio", "/charaktere/[id]"],
} as const satisfies Record<string, readonly string[]>;
