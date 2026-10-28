import { and, asc, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import type { AppDatabase } from "@/lib/db/client";
import {
  characters,
  guildMembers,
  resourceStates,
  taskDefinitions,
  taskProgress,
  users,
} from "@/lib/db/schema";
import { isCompleted } from "@/lib/reset/completion";
import { scopeKey } from "@/lib/reset/scope-key";
import { resourceView } from "@/lib/tasks/resource-view";
import { resolveTasks, type ResolvedTask } from "@/lib/tasks/task-context";
import { taskPeriod } from "@/lib/tasks/task-period";
import { localize } from "@/i18n/localize";

export type MatrixMode = "member" | "character";

/** One cell: a short text, whether it counts as done, and optional detail for a tooltip. */
export interface MatrixCell {
  text: string;
  /** true = done, false = open, null = information only (resources, unknown). */
  done: boolean | null;
  detail?: string;
  /** Character mode: the value is shared with other characters (server/account task). */
  shared?: boolean;
}

export interface MatrixColumn {
  key: string;
  label: string;
  sublabel?: string;
}

export interface MatrixRow {
  taskId: number;
  title: string;
  category: string | null;
  cells: MatrixCell[];
}

export interface GameMatrix {
  columns: MatrixColumn[];
  rows: MatrixRow[];
  categories: string[];
}

type CharacterRow = typeof characters.$inferSelect;
type ProgressRow = typeof taskProgress.$inferSelect;
type ResourceRow = typeof resourceStates.$inferSelect;

interface Member {
  userId: string;
  name: string;
  characters: CharacterRow[];
}

interface State {
  progress: Map<string, ProgressRow>;
  resources: Map<string, ResourceRow>;
}

const EMPTY: MatrixCell = { text: "", done: null };

/**
 * The guild matrix of one game (SPEC 7, item 5): rows are the game's pack tasks, columns
 * the active members or their characters. Private tasks never appear; guild-wide tasks
 * are shared state and shown separately.
 */
export function buildGameMatrix(
  db: AppDatabase,
  guildId: number,
  gameId: string,
  mode: MatrixMode,
  category: string | undefined,
  now: DateTime = DateTime.now(),
): GameMatrix {
  const allTasks = resolveTasks(
    db,
    guildId,
    db
      .select()
      .from(taskDefinitions)
      .where(
        and(
          eq(taskDefinitions.gameId, gameId),
          eq(taskDefinitions.source, "pack"),
          eq(taskDefinitions.active, true),
        ),
      )
      .orderBy(asc(taskDefinitions.sortOrder), asc(taskDefinitions.id))
      .all(),
  );
  const categories = [
    ...new Set(
      allTasks
        .map((task) => task.category)
        .filter((value): value is string => value !== null),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const tasks = allTasks
    .filter((task) => !category || task.category === category)
    .flatMap((task) => {
      const period = taskPeriod(task, now);
      return period ? [{ task, periodKey: period.key }] : [];
    });

  const members = loadMembers(db, guildId, gameId);
  const state = loadState(db, tasks);
  const cellOf = (task: ResolvedTask, periodKey: string, key: string) =>
    evaluate(task, periodKey, key, state, now);

  if (mode === "character") {
    const columns = members.flatMap((member) =>
      member.characters.map((character) => ({ member, character })),
    );
    return {
      categories,
      columns: columns.map(({ member, character }) => ({
        key: `c${character.id}`,
        label: character.name,
        sublabel: member.name,
      })),
      rows: tasks.map(({ task, periodKey }) => ({
        taskId: task.id,
        title: localize(task.title),
        category: task.category,
        cells: columns.map(({ character }) => ({
          ...cellOf(task, periodKey, scopeKey(task.scope, ownerOf(character))),
          shared: task.scope !== "character",
        })),
      })),
    };
  }

  return {
    categories,
    columns: members.map((member) => ({
      key: member.userId,
      label: member.name,
    })),
    rows: tasks.map(({ task, periodKey }) => ({
      taskId: task.id,
      title: localize(task.title),
      category: task.category,
      cells: members.map((member) =>
        memberCell(task, periodKey, member, cellOf),
      ),
    })),
  };
}

function ownerOf(character: CharacterRow) {
  return {
    userId: character.userId,
    gameId: character.gameId,
    characterId: character.id,
    server: character.serverKey,
  };
}

/**
 * Per-member view: an account task directly; character tasks (and server tasks across
 * several servers) as "done of total", with the names as detail.
 */
function memberCell(
  task: ResolvedTask,
  periodKey: string,
  member: Member,
  cellOf: (task: ResolvedTask, periodKey: string, key: string) => MatrixCell,
): MatrixCell {
  const units = new Map<string, string>();
  for (const character of member.characters) {
    const key = scopeKey(task.scope, ownerOf(character));
    const label =
      task.scope === "server"
        ? (character.serverName ?? character.name)
        : character.name;
    units.set(key, units.get(key) ?? label);
  }
  const cells = [...units].map(([key, label]) => ({
    label,
    cell: cellOf(task, periodKey, key),
  }));
  if (cells.length === 1) {
    return cells[0].cell;
  }
  if (cells.every(({ cell }) => cell.done === null)) {
    const known = cells.filter(({ cell }) => cell.text !== "");
    return known.length === 0
      ? EMPTY
      : {
          text: known.map(({ cell }) => cell.text).join(" · "),
          done: null,
          detail: known
            .map(({ label, cell }) => `${label}: ${cell.text}`)
            .join(", "),
        };
  }
  const done = cells.filter(({ cell }) => cell.done === true);
  return {
    text: `${done.length}/${cells.length}`,
    done: done.length === cells.length,
    detail: cells
      .map(({ label, cell }) => `${label}: ${cell.text || "–"}`)
      .join(", "),
  };
}

function evaluate(
  task: ResolvedTask,
  periodKey: string,
  key: string,
  state: State,
  now: DateTime,
): MatrixCell {
  const stateKey = `${task.id}|${key}`;
  const resource = resourceView(task, state.resources.get(stateKey), now);
  if (resource) {
    // Resources only show once someone reported a value (SPEC 7, item 5).
    return resource.value === null
      ? EMPTY
      : { text: `${resource.value}/${resource.cap}`, done: null };
  }

  const progress = state.progress.get(stateKey);
  const done = isCompleted(task, progress, periodKey);
  switch (task.kind) {
    case "counter":
      return {
        text: task.cap
          ? `${progress?.value ?? 0}/${task.cap}`
          : `${progress?.value ?? 0}`,
        done,
      };
    case "lockout": {
      const bosses = task.bosses ?? [];
      if (bosses.length === 0) {
        return { text: done ? "✓" : "–", done };
      }
      const killed = progress?.data?.killed?.length ?? 0;
      if (done) {
        return { text: "voll", done };
      }
      return {
        text: killed === 0 ? "frei" : `${killed}/${bosses.length}`,
        done,
      };
    }
    default:
      return { text: done ? "✓" : "–", done };
  }
}

function loadMembers(
  db: AppDatabase,
  guildId: number,
  gameId: string,
): Member[] {
  const rows = db
    .select({ character: characters, name: users.name })
    .from(characters)
    .innerJoin(users, eq(users.id, characters.userId))
    .innerJoin(
      guildMembers,
      and(
        eq(guildMembers.userId, characters.userId),
        eq(guildMembers.guildId, guildId),
      ),
    )
    .where(
      and(eq(characters.gameId, gameId), eq(guildMembers.status, "active")),
    )
    .orderBy(asc(users.name), asc(characters.name))
    .all();
  const members = new Map<string, Member>();
  for (const { character, name } of rows) {
    const member = members.get(character.userId) ?? {
      userId: character.userId,
      name: name ?? "?",
      characters: [],
    };
    member.characters.push(character);
    members.set(character.userId, member);
  }
  return [...members.values()];
}

function loadState(
  db: AppDatabase,
  tasks: Array<{ task: ResolvedTask; periodKey: string }>,
): State {
  if (tasks.length === 0) {
    return { progress: new Map(), resources: new Map() };
  }
  const taskIds = tasks.map(({ task }) => task.id);
  const currentKey = new Map(
    tasks.map(({ task, periodKey }) => [task.id, periodKey]),
  );
  const progress = db
    .select()
    .from(taskProgress)
    .where(
      and(
        inArray(taskProgress.taskId, taskIds),
        inArray(taskProgress.periodKey, [...new Set(currentKey.values())]),
      ),
    )
    .all()
    .filter((row) => currentKey.get(row.taskId) === row.periodKey);
  const resources = db
    .select()
    .from(resourceStates)
    .where(inArray(resourceStates.taskId, taskIds))
    .all();
  return {
    progress: new Map(
      progress.map((row) => [`${row.taskId}|${row.scopeKey}`, row]),
    ),
    resources: new Map(
      resources.map((row) => [`${row.taskId}|${row.scopeKey}`, row]),
    ),
  };
}
