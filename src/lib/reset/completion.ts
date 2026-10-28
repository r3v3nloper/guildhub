import type { TaskKind } from "./task-kinds";

/** `period_key` of tasks without a reset rule (one_time, permanent counters). */
export const ONCE_PERIOD_KEY = "once";

export interface CompletionTask {
  kind: TaskKind;
  cap: number | null;
  bosses: readonly string[] | null;
}

export interface ProgressEntry {
  periodKey: string;
  value: number;
  data: { killed?: string[]; note?: string } | null;
  completedAt: Date | null;
}

/** SPEC 5.1. Resources are never "done"; their state comes from the projection instead. */
export function isCompleted(
  task: CompletionTask,
  progress: ProgressEntry | undefined,
  periodKey: string,
): boolean {
  if (!progress || progress.periodKey !== periodKey) {
    return false;
  }
  switch (task.kind) {
    case "recurring":
    case "one_time":
      return progress.completedAt !== null;
    case "counter":
      return task.cap !== null && progress.value >= task.cap;
    case "lockout": {
      if (progress.completedAt !== null) {
        return true;
      }
      const bosses = task.bosses ?? [];
      const killed = new Set(progress.data?.killed ?? []);
      return bosses.length > 0 && bosses.every((boss) => killed.has(boss));
    }
    case "regen":
    case "stacking":
      return false;
  }
}
