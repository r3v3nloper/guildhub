import type { AppDatabase } from "@/lib/db/client";
import type { ResetRule } from "@/lib/reset/types";
import type { TaskScope } from "@/lib/reset/task-kinds";
import {
  catalogOfKind,
  listEnabledGames,
  loadGameCatalog,
} from "@/lib/roster/game-catalog";
import { describeResetRule } from "@/i18n/reset-rule";
import { localize } from "@/i18n/localize";
import { allowedScopes, type TaskRow } from "./custom-tasks";
import { CUSTOM_RULE, NO_RULE } from "./rule-choices";

export interface TaskFormGame {
  /** Empty for cross-game tasks. */
  id: string;
  name: string;
  scopes: TaskScope[];
  rules: Array<{ value: string; label: string }>;
}

/** Everything the custom-task form offers per game, including the cross-game choice. */
export function taskFormGames(
  db: AppDatabase,
  guildId: number,
  crossGameLabel: string,
): TaskFormGame[] {
  const games = listEnabledGames(db, guildId).flatMap((game) => {
    const catalog = loadGameCatalog(db, game.id);
    if (!catalog) {
      return [];
    }
    return [
      {
        id: game.id,
        name: localize(game.name),
        scopes: allowedScopes(catalog),
        rules: catalogOfKind(catalog, "reset_rule")
          .filter((entry) => entry.status === "active")
          .map((entry) => ({
            value: entry.key,
            label: describeResetRule(entry.data as unknown as ResetRule),
          })),
      },
    ];
  });
  return [
    {
      id: "",
      name: crossGameLabel,
      scopes: allowedScopes(undefined),
      rules: [],
    },
    ...games,
  ];
}

/** Form values as strings, the way the inputs hold them. */
export interface CustomTaskFormValues {
  title: string;
  game: string;
  kind: string;
  scope: string;
  category: string;
  link: string;
  rule: string;
  ruleType: string;
  ruleTime: string;
  ruleWeekday: string;
  ruleDayOfMonth: string;
  ruleNDays: string;
  ruleAnchor: string;
  cap: string;
  alertAt: string;
  regenAmount: string;
  regenIntervalMinutes: string;
  regenAlignment: string;
  perPeriodGain: string;
}

const text = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** Start values for a new task: daily at 05:00, for every character of the first game. */
export function newTaskFormValues(games: TaskFormGame[]): CustomTaskFormValues {
  const game = games.find((candidate) => candidate.id !== "") ?? games[0];
  return {
    title: "",
    game: game.id,
    kind: "recurring",
    scope: game.scopes[0],
    category: "",
    link: "",
    rule: game.rules[0]?.value ?? CUSTOM_RULE,
    ruleType: "daily",
    ruleTime: "05:00",
    ruleWeekday: "",
    ruleDayOfMonth: "",
    ruleNDays: "",
    ruleAnchor: "",
    cap: "",
    alertAt: "",
    regenAmount: "",
    regenIntervalMinutes: "",
    regenAlignment: "fixed",
    perPeriodGain: "",
  };
}

export function taskFormValues(
  task: TaskRow,
  packRuleKey: string | undefined,
): CustomTaskFormValues {
  const custom = task.customResetRule;
  return {
    title: localize(task.title),
    game: task.gameId ?? "",
    kind: task.kind,
    scope: task.scope,
    category: task.category ?? "",
    link: task.link ?? "",
    rule: custom ? CUSTOM_RULE : (packRuleKey ?? NO_RULE),
    ruleType: custom?.type ?? "daily",
    ruleTime: custom?.time ?? "05:00",
    ruleWeekday: text(custom?.weekday),
    ruleDayOfMonth: text(custom?.day_of_month),
    ruleNDays: text(custom?.n_days),
    ruleAnchor: text(custom?.anchor),
    cap: text(task.cap),
    alertAt: text(task.alertAt),
    regenAmount: text(task.regenAmount),
    regenIntervalMinutes: text(task.regenIntervalMinutes),
    regenAlignment: task.regenAlignment ?? "fixed",
    perPeriodGain: text(task.perPeriodGain),
  };
}
