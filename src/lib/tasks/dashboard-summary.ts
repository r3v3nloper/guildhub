import { isResourceKind } from "@/lib/reset/task-kinds";
import type { Dashboard, DashboardItem } from "./dashboard";

/** A regen or stacking resource that has reached its alert level and wants spending. */
export interface FullResource {
  key: string;
  title: string;
  /** Character, server or game it belongs to; null for general and guild tasks. */
  owner: string | null;
  value: number;
  cap: number;
}

export interface DashboardSummary {
  /** Tasks to tick, without resources: they never count as "done". */
  total: number;
  done: number;
  full: FullResource[];
  /** ISO time of the soonest reset among open tasks. */
  nextReset: string | null;
}

/** Totals for the head of the "Heute" page. */
export function summarizeDashboard(dashboard: Dashboard): DashboardSummary {
  const entries: { item: DashboardItem; owner: string | null }[] = [
    ...dashboard.guild.map((item) => ({ item, owner: null })),
    ...dashboard.general.map((item) => ({ item, owner: null })),
    ...dashboard.games.flatMap((game) => [
      ...game.items.map((item) => ({ item, owner: game.name })),
      ...game.servers.flatMap((server) => [
        ...server.items.map((item) => ({
          item,
          owner: server.name ?? game.name,
        })),
        ...server.characters.flatMap((character) =>
          character.items.map((item) => ({ item, owner: character.name })),
        ),
      ]),
    ]),
  ];

  const tasks = entries.filter(({ item }) => !isResourceKind(item.kind));
  const open = tasks.filter(({ item }) => item.status !== "done");
  const resets = open
    .map(({ item }) => item.nextReset)
    .filter((reset): reset is string => reset !== null)
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    total: tasks.length,
    done: tasks.length - open.length,
    full: entries.flatMap(({ item, owner }) => {
      const value = item.resource?.value ?? null;
      if (!item.resource || value === null || item.status !== "open") {
        return [];
      }
      return [
        {
          key: `${item.taskId}-${item.characterId ?? "all"}`,
          title: item.title,
          owner,
          value,
          cap: item.resource.cap,
        },
      ];
    }),
    nextReset: resets[0] ?? null,
  };
}
