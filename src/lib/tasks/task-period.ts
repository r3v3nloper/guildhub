import type { DateTime } from "luxon";
import { ONCE_PERIOD_KEY } from "@/lib/reset/completion";
import { getPeriod, InvalidResetRuleError } from "@/lib/reset/periods";
import type { ResolvedTask } from "./task-context";

export interface TaskPeriod {
  key: string;
  /** Next reset; undefined for tasks without a rule. */
  next: DateTime | undefined;
}

/**
 * The period a task is in right now. Undefined when its rule cannot start yet
 * (an every_n_days anchor in the future), so the task is simply not due.
 */
export function taskPeriod(
  task: ResolvedTask,
  now: DateTime,
): TaskPeriod | undefined {
  if (!task.rule) {
    return { key: ONCE_PERIOD_KEY, next: undefined };
  }
  try {
    const period = getPeriod(task.rule, task.ruleZone, now);
    return { key: period.key, next: period.next };
  } catch (error) {
    if (error instanceof InvalidResetRuleError) {
      return undefined;
    }
    throw error;
  }
}
