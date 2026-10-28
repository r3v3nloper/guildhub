import { DateTime } from "luxon";
import type { resourceStates } from "@/lib/db/schema";
import {
  projectRegen,
  projectStacking,
  regenFullAt,
} from "@/lib/reset/resources";
import type { ResolvedTask } from "./task-context";

type ResourceRow = typeof resourceStates.$inferSelect;

/** How a task shows up: open, done, or as information only (resources below alert). */
export type ItemStatus = "open" | "done" | "info";

export interface ResourceView {
  /** Projected value, or null while no snapshot exists. */
  value: number | null;
  cap: number;
  /** ISO time the resource will be full; regen only. */
  fullAt: string | null;
}

/** Projection of a regen/stacking task from its last snapshot (SPEC 5.3); null otherwise. */
export function resourceView(
  task: ResolvedTask,
  snapshot: ResourceRow | undefined,
  now: DateTime,
): ResourceView | null {
  if (task.kind !== "regen" && task.kind !== "stacking") {
    return null;
  }
  const cap = task.cap ?? 0;
  if (!snapshot) {
    return { value: null, cap, fullAt: null };
  }
  const reported = {
    value: snapshot.value,
    valueAt: DateTime.fromJSDate(snapshot.valueAt),
  };
  if (task.kind === "stacking") {
    const value = task.rule
      ? projectStacking(
          { cap, perPeriodGain: task.perPeriodGain ?? 0 },
          task.rule,
          task.ruleZone,
          reported,
          now,
        )
      : reported.value;
    return { value, cap, fullAt: null };
  }
  const settings = {
    cap,
    regenAmount: task.regenAmount ?? 0,
    regenIntervalMinutes: task.regenIntervalMinutes ?? 60,
    regenAlignment: task.regenAlignment ?? "fixed",
  };
  return {
    value: projectRegen(settings, task.regenZone, reported, now),
    cap,
    fullAt:
      regenFullAt(settings, task.regenZone, reported, now)?.toISO() ?? null,
  };
}

/** Resources are never done; they only count as open once they reach alert_at (SPEC 5.3). */
export function resourceStatus(
  task: ResolvedTask,
  resource: ResourceView,
): ItemStatus {
  if (resource.value === null) {
    return "info";
  }
  return resource.value >= (task.alertAt ?? resource.cap) ? "open" : "info";
}
