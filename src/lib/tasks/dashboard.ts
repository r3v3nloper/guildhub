import { and, asc, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import type { AppDatabase } from "@/lib/db/client";
import {
  characters,
  gameCatalogEntries,
  resourceStates,
  taskProgress,
  users,
} from "@/lib/db/schema";
import type { LocalizedString } from "@/lib/packs/schema";
import { isCompleted } from "@/lib/reset/completion";
import { scopeKey } from "@/lib/reset/scope-key";
import type { TaskKind } from "@/lib/reset/task-kinds";
import { localize } from "@/i18n/localize";
import { loadVisibleTasks, type ResolvedTask } from "./task-context";
import {
  resourceStatus,
  resourceView,
  type ItemStatus,
  type ResourceView,
} from "./resource-view";
import { taskPeriod, type TaskPeriod } from "./task-period";

export type { ItemStatus } from "./resource-view";

export interface BossView {
  key: string;
  name: string;
  killed: boolean;
}

export type { ResourceView } from "./resource-view";

/** One task as it appears in the "Heute" dashboard (SPEC 7, item 3). */
export interface DashboardItem {
  taskId: number;
  characterId: number | null;
  title: string;
  category: string | null;
  link: string | null;
  todo: boolean;
  kind: TaskKind;
  status: ItemStatus;
  value: number;
  cap: number | null;
  bosses: BossView[];
  resource: ResourceView | null;
  /** ISO time of the next reset; null for tasks without a rule. */
  nextReset: string | null;
  /** Guild tasks are ticked together; this is who ticked it last. */
  doneBy: string | null;
}

export interface DashboardCharacter {
  id: number;
  name: string;
  items: DashboardItem[];
}

export interface DashboardServer {
  key: string;
  name: string | null;
  items: DashboardItem[];
  characters: DashboardCharacter[];
}

export interface DashboardGame {
  id: string;
  name: string;
  serverLabel: string;
  items: DashboardItem[];
  servers: DashboardServer[];
}

export interface Dashboard {
  general: DashboardItem[];
  /** Guild-wide tasks, ticked once for everyone. */
  guild: DashboardItem[];
  games: DashboardGame[];
  openCount: number;
}

export interface DashboardGameInfo {
  id: string;
  name: LocalizedString;
  serverLabel: LocalizedString;
}

type CharacterRow = typeof characters.$inferSelect;
type ProgressRow = typeof taskProgress.$inferSelect;
type ResourceRow = typeof resourceStates.$inferSelect;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Builds the personal dashboard for the given (enabled, filtered) games. */
export function buildDashboard(
  db: AppDatabase,
  guildId: number,
  userId: string,
  games: readonly DashboardGameInfo[],
  now: DateTime = DateTime.now(),
): Dashboard {
  const gameIds = games.map((game) => game.id);
  const tasks = loadVisibleTasks(db, guildId, userId, gameIds)
    .map((task) => ({ task, period: taskPeriod(task, now) }))
    .filter(
      (entry): entry is { task: ResolvedTask; period: TaskPeriod } =>
        entry.period !== undefined,
    )
    .sort((a, b) => compareTasks(a.task, b.task));
  const ownCharacters =
    gameIds.length === 0
      ? []
      : db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.userId, userId),
              inArray(characters.gameId, gameIds),
            ),
          )
          .orderBy(asc(characters.name))
          .all();

  const state = loadState(db, tasks, ownCharacters, userId, guildId);
  const bossNames = loadBossNames(db, gameIds);
  const item = (
    entry: { task: ResolvedTask; period: TaskPeriod },
    key: string,
    characterId: number | null,
  ) => toItem(entry, key, characterId, state, bossNames, now);

  const general = tasks
    .filter((entry) => entry.task.scope === "user")
    .map((entry) =>
      item(entry, scopeKey("user", { userId, gameId: null }), null),
    );
  const guild = tasks
    .filter((entry) => entry.task.scope === "guild")
    .map((entry) =>
      item(entry, scopeKey("guild", { userId, gameId: null, guildId }), null),
    );

  const dashboardGames = games.flatMap((game): DashboardGame[] => {
    const gameCharacters = ownCharacters.filter(
      (character) => character.gameId === game.id,
    );
    const gameTasks = tasks.filter((entry) => entry.task.gameId === game.id);
    if (gameCharacters.length === 0 || gameTasks.length === 0) {
      return [];
    }
    const ofScope = (scope: ResolvedTask["scope"]) =>
      gameTasks.filter((entry) => entry.task.scope === scope);

    const servers = groupByServer(gameCharacters).map(
      (group): DashboardServer => {
        const serverKey = scopeKey("server", ownerOf(group.characters[0]));
        return {
          key: serverKey,
          name: group.name,
          items: ofScope("server").map((entry) =>
            item(entry, serverKey, group.characters[0].id),
          ),
          characters: group.characters.map((character) => ({
            id: character.id,
            name: character.name,
            items: ofScope("character").map((entry) =>
              item(
                entry,
                scopeKey("character", ownerOf(character)),
                character.id,
              ),
            ),
          })),
        };
      },
    );

    return [
      {
        id: game.id,
        name: localize(game.name),
        serverLabel: localize(game.serverLabel),
        items: ofScope("account").map((entry) =>
          item(entry, scopeKey("account", { userId, gameId: game.id }), null),
        ),
        servers,
      },
    ];
  });

  const allItems = [
    ...general,
    ...guild,
    ...dashboardGames.flatMap((game) => [
      ...game.items,
      ...game.servers.flatMap((server) => [
        ...server.items,
        ...server.characters.flatMap((character) => character.items),
      ]),
    ]),
  ];
  return {
    general,
    guild,
    games: dashboardGames,
    openCount: allItems.filter((entry) => entry.status === "open").length,
  };
}

function compareTasks(a: ResolvedTask, b: ResolvedTask): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
    localize(a.title).localeCompare(localize(b.title))
  );
}

function ownerOf(character: CharacterRow) {
  return {
    userId: character.userId,
    gameId: character.gameId,
    characterId: character.id,
    server: character.serverKey,
  };
}

/** Characters sharing a server key, in the order they first appear. */
function groupByServer(list: CharacterRow[]) {
  const groups = new Map<
    string,
    { name: string | null; characters: CharacterRow[] }
  >();
  for (const character of list) {
    const key = character.serverKey ?? `c${character.id}`;
    const group = groups.get(key) ?? {
      name: character.serverName ?? character.serverKey,
      characters: [],
    };
    group.characters.push(character);
    groups.set(key, group);
  }
  // Characters without a server form one group each and come last.
  const withServer = [...groups.values()].filter(
    (group) => group.name !== null,
  );
  const withoutServer = [...groups.values()].filter(
    (group) => group.name === null,
  );
  return [...withServer, ...withoutServer];
}

interface LoadedState {
  progress: Map<string, ProgressRow>;
  resources: Map<string, ResourceRow>;
  /** Names of whoever last changed a loaded progress entry. */
  names: Map<string, string>;
}

const stateKey = (taskId: number, key: string) => `${taskId}|${key}`;

function loadState(
  db: AppDatabase,
  tasks: Array<{ task: ResolvedTask; period: TaskPeriod }>,
  ownCharacters: CharacterRow[],
  userId: string,
  guildId: number,
): LoadedState {
  const taskIds = tasks.map((entry) => entry.task.id);
  if (taskIds.length === 0) {
    return { progress: new Map(), resources: new Map(), names: new Map() };
  }
  const scopeKeys = [
    scopeKey("user", { userId, gameId: null }),
    scopeKey("guild", { userId, gameId: null, guildId }),
    ...ownCharacters.flatMap((character) => [
      scopeKey("character", ownerOf(character)),
      scopeKey("server", ownerOf(character)),
      scopeKey("account", ownerOf(character)),
    ]),
  ];
  const periodKeys = [...new Set(tasks.map((entry) => entry.period.key))];

  const progress = db
    .select()
    .from(taskProgress)
    .where(
      and(
        inArray(taskProgress.taskId, taskIds),
        inArray(taskProgress.scopeKey, scopeKeys),
        inArray(taskProgress.periodKey, periodKeys),
      ),
    )
    .all();
  const resources = db
    .select()
    .from(resourceStates)
    .where(
      and(
        inArray(resourceStates.taskId, taskIds),
        inArray(resourceStates.scopeKey, scopeKeys),
      ),
    )
    .all();

  // Several period keys may be loaded per task; only the task's current one counts.
  const currentKey = new Map(
    tasks.map((entry) => [entry.task.id, entry.period.key]),
  );
  const current = progress.filter(
    (row) => currentKey.get(row.taskId) === row.periodKey,
  );
  return {
    progress: new Map(
      current.map((row) => [stateKey(row.taskId, row.scopeKey), row]),
    ),
    names: loadNames(
      db,
      current
        .map((row) => row.updatedBy)
        .filter((id): id is string => id !== null),
    ),
    resources: new Map(
      resources.map((row) => [stateKey(row.taskId, row.scopeKey), row]),
    ),
  };
}

function loadNames(db: AppDatabase, userIds: string[]): Map<string, string> {
  if (userIds.length === 0) {
    return new Map();
  }
  return new Map(
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, [...new Set(userIds)]))
      .all()
      .map((user) => [user.id, user.name ?? "?"]),
  );
}

function loadBossNames(
  db: AppDatabase,
  gameIds: string[],
): Map<string, string> {
  if (gameIds.length === 0) {
    return new Map();
  }
  return new Map(
    db
      .select()
      .from(gameCatalogEntries)
      .where(
        and(
          inArray(gameCatalogEntries.gameId, gameIds),
          eq(gameCatalogEntries.kind, "boss"),
        ),
      )
      .all()
      .map((entry) => [`${entry.gameId}|${entry.key}`, localize(entry.name)]),
  );
}

function toItem(
  { task, period }: { task: ResolvedTask; period: TaskPeriod },
  key: string,
  characterId: number | null,
  state: LoadedState,
  bossNames: Map<string, string>,
  now: DateTime,
): DashboardItem {
  const progress = state.progress.get(stateKey(task.id, key));
  const killed = new Set(progress?.data?.killed ?? []);
  const resource = resourceView(
    task,
    state.resources.get(stateKey(task.id, key)),
    now,
  );
  return {
    taskId: task.id,
    characterId,
    title: localize(task.title),
    category: task.category,
    link: task.link,
    todo: task.todo,
    kind: task.kind,
    status: resource
      ? resourceStatus(task, resource)
      : isCompleted(task, progress, period.key)
        ? "done"
        : "open",
    value: progress?.value ?? 0,
    cap: task.cap,
    bosses: (task.bosses ?? []).map((boss) => ({
      key: boss,
      name: bossNames.get(`${task.gameId}|${boss}`) ?? boss,
      killed: killed.has(boss),
    })),
    resource,
    nextReset: period.next?.toISO() ?? null,
    doneBy:
      task.scope === "guild" && progress?.updatedBy
        ? (state.names.get(progress.updatedBy) ?? null)
        : null,
  };
}
