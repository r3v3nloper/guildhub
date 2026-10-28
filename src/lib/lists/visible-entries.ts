import { eq, or } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { Visibility } from "./visibility";

/** Anything a member creates and may share: to-do lists, checklists, farm spots. */
export interface SharedEntry {
  ownerId: string;
  visibility: Visibility;
}

/** Private entries exist only for their author; guild entries for every member. */
export function isVisibleTo(entry: SharedEntry, userId: string): boolean {
  return entry.visibility === "guild" || entry.ownerId === userId;
}

/** The same rule as a query filter. */
export function visibleToFilter(
  table: { ownerId: SQLiteColumn; visibility: SQLiteColumn },
  userId: string,
) {
  return or(eq(table.ownerId, userId), eq(table.visibility, "guild"));
}
