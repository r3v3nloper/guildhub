import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { CatalogKind } from "@/lib/packs/catalog";
import type { Capabilities, LocalizedString, Pack } from "@/lib/packs/schema";
import { TASK_KINDS, TASK_SCOPES } from "@/lib/reset/task-kinds";
import type { ResetRule } from "@/lib/reset/types";
import { VISIBILITIES, type Visibility } from "@/lib/lists/visibility";

const createdAt = (name = "created_at") =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

// Tables follow the shape @auth/drizzle-adapter expects; column names are snake_case.
// `name` and `image` hold the Discord display name and avatar (SPEC 4.1 display_name/avatar_url),
// the Discord ID itself is `account.provider_account_id`.
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = sqliteTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

// --- Guild & access (SPEC 4.1, 7.2) ---

export const MEMBER_ROLES = ["owner", "officer", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const MEMBER_STATUSES = ["active", "disabled"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const guilds = sqliteTable("guild", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  discordGuildId: text("discord_guild_id"),
  defaultTimezone: text("default_timezone").notNull(),
});

export const guildMembers = sqliteTable(
  "guild_member",
  {
    guildId: integer("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: MEMBER_ROLES }).notNull().default("member"),
    status: text("status", { enum: MEMBER_STATUSES })
      .notNull()
      .default("active"),
    disabledAt: integer("disabled_at", { mode: "timestamp_ms" }),
    joinedAt: createdAt("joined_at"),
  },
  (member) => [primaryKey({ columns: [member.guildId, member.userId] })],
);

export const allowlistEntries = sqliteTable("allowlist_entry", {
  discordId: text("discord_id").primaryKey(),
  addedBy: text("added_by").references(() => users.id, {
    onDelete: "set null",
  }),
  addedAt: createdAt("added_at"),
  source: text("source", { enum: ["env", "admin"] }).notNull(),
});

// --- Games & pack catalogs (SPEC 4.1, 6.5) ---

/** Pack metadata the UI needs without re-reading pack.json. */
export interface GameMeta {
  type: Pack["type"];
  capabilities: Capabilities;
  characterLabel: LocalizedString;
  serverLabel: LocalizedString;
  regions: Pack["regions"];
  buildSources: Pack["build_sources"];
}

export const games = sqliteTable("game", {
  id: text("id").primaryKey(),
  name: text("name", { mode: "json" }).$type<LocalizedString>().notNull(),
  meta: text("meta", { mode: "json" }).$type<GameMeta>().notNull(),
  packVersion: text("pack_version").notNull(),
  packHash: text("pack_hash").notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
  lastSyncError: text("last_sync_error"),
});

export const guildGames = sqliteTable(
  "guild_game",
  {
    guildId: integer("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    regionId: text("region_id"),
  },
  (guildGame) => [
    primaryKey({ columns: [guildGame.guildId, guildGame.gameId] }),
  ],
);

export const CATALOG_STATUSES = ["active", "deprecated", "removed"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const gameCatalogEntries = sqliteTable(
  "game_catalog_entry",
  {
    // Surrogate key, so characters can reference an entry with a plain foreign key.
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    kind: text("kind").$type<CatalogKind>().notNull(),
    key: text("key").notNull(),
    name: text("name", { mode: "json" }).$type<LocalizedString>().notNull(),
    data: text("data", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    status: text("status", { enum: CATALOG_STATUSES })
      .notNull()
      .default("active"),
    lastSeenPackVersion: text("last_seen_pack_version").notNull(),
    todo: integer("todo", { mode: "boolean" }).notNull().default(false),
  },
  (entry) => [
    uniqueIndex("game_catalog_entry_game_kind_key").on(
      entry.gameId,
      entry.kind,
      entry.key,
    ),
  ],
);

// --- Characters (SPEC 4.1, 4.6, 4.7) ---

const catalogReference = (name: string) =>
  integer(name).references((): AnySQLiteColumn => gameCatalogEntries.id);

export const characters = sqliteTable(
  "character",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    name: text("name").notNull(),
    // Catalog key if the pack lists servers, otherwise the normalised free text (SPEC 4.6).
    serverKey: text("server_key"),
    serverName: text("server_name"),
    factionEntryId: catalogReference("faction_entry_id"),
    raceEntryId: catalogReference("race_entry_id"),
    classEntryId: catalogReference("class_entry_id"),
    spec: text("spec"),
    level: integer("level"),
    isMain: integer("is_main", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (character) => [
    index("character_user").on(character.userId),
    index("character_game").on(character.gameId),
  ],
);

export const characterProfessions = sqliteTable(
  "character_profession",
  {
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    professionEntryId: integer("profession_entry_id")
      .notNull()
      .references(() => gameCatalogEntries.id),
    skillLevel: integer("skill_level"),
    specialization: text("specialization"),
    notes: text("notes"),
  },
  (profession) => [
    primaryKey({
      columns: [profession.characterId, profession.professionEntryId],
    }),
  ],
);

export const BUILD_STATUSES = ["current", "planned"] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export const builds = sqliteTable(
  "build",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    source: text("source"),
    status: text("status", { enum: BUILD_STATUSES })
      .notNull()
      .default("current"),
    targetClassEntryId: catalogReference("target_class_entry_id"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (build) => [index("build_character").on(build.characterId)],
);

// --- Tasks & progress (SPEC 4.1, 4.2, 5) ---

export const TASK_SOURCES = ["pack", "guild", "private"] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export const REGEN_ALIGNMENTS = ["fixed", "relative"] as const;

export const taskDefinitions = sqliteTable(
  "task_definition",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // Empty only for cross-game custom tasks (scope user).
    gameId: text("game_id").references(() => games.id),
    source: text("source", { enum: TASK_SOURCES }).notNull(),
    // The pack's task ID; empty for custom tasks. NULLs never collide in the unique index.
    key: text("key"),
    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    title: text("title", { mode: "json" }).$type<LocalizedString>().notNull(),
    description: text("description", {
      mode: "json",
    }).$type<LocalizedString>(),
    kind: text("kind", { enum: TASK_KINDS }).notNull(),
    category: text("category"),
    scope: text("scope", { enum: TASK_SCOPES }).notNull(),
    // A pack rule of the game, or a rule of the task's own (SPEC 4.3) – never both.
    resetRuleEntryId: catalogReference("reset_rule_entry_id"),
    customResetRule: text("custom_reset_rule", {
      mode: "json",
    }).$type<ResetRule>(),
    cap: integer("cap"),
    regenAmount: integer("regen_amount"),
    regenIntervalMinutes: integer("regen_interval_minutes"),
    regenAlignment: text("regen_alignment", { enum: REGEN_ALIGNMENTS }),
    timezone: text("timezone"),
    perPeriodGain: integer("per_period_gain"),
    alertAt: integer("alert_at"),
    bosses: text("bosses", { mode: "json" }).$type<string[]>(),
    priority: text("priority", { enum: TASK_PRIORITIES })
      .notNull()
      .default("medium"),
    sortOrder: integer("sort_order"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
    link: text("link"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    todo: integer("todo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (task) => [
    uniqueIndex("task_definition_game_key").on(task.gameId, task.key),
    index("task_definition_owner").on(task.ownerId),
  ],
);

export interface ProgressData {
  killed?: string[];
  note?: string;
}

export const taskProgress = sqliteTable(
  "task_progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => taskDefinitions.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull(),
    periodKey: text("period_key").notNull(),
    value: integer("value").notNull().default(0),
    data: text("data", { mode: "json" }).$type<ProgressData>(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (progress) => [
    uniqueIndex("task_progress_task_scope_period").on(
      progress.taskId,
      progress.scopeKey,
      progress.periodKey,
    ),
    index("task_progress_scope").on(progress.scopeKey),
  ],
);

export const resourceStates = sqliteTable(
  "resource_state",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => taskDefinitions.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull(),
    value: integer("value").notNull(),
    valueAt: integer("value_at", { mode: "timestamp_ms" }).notNull(),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (state) => [
    uniqueIndex("resource_state_task_scope").on(state.taskId, state.scopeKey),
  ],
);

// --- Personal and shared lists (SPEC 10, Phase 2) ---

export { VISIBILITIES, type Visibility };

export const todoLists = sqliteTable("todo_list", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Guild lists are shared state: an entry ticked by one member is done for everyone.
  visibility: text("visibility", { enum: VISIBILITIES })
    .notNull()
    .default("private"),
  createdAt: createdAt(),
});

export const todoItems = sqliteTable(
  "todo_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listId: integer("list_id")
      .notNull()
      .references(() => todoLists.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    doneBy: text("done_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (item) => [index("todo_item_list").on(item.listId)],
);

/** A dungeon checklist template (SPEC 10, Phase 2); every user ticks it for their own run. */
export const checklists = sqliteTable("checklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  name: text("name").notNull(),
  visibility: text("visibility", { enum: VISIBILITIES })
    .notNull()
    .default("private"),
  createdAt: createdAt(),
});

export const checklistItems = sqliteTable(
  "checklist_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    checklistId: integer("checklist_id")
      .notNull()
      .references(() => checklists.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (item) => [index("checklist_item_checklist").on(item.checklistId)],
);

export const checklistTicks = sqliteTable(
  "checklist_tick",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => checklistItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (tick) => [primaryKey({ columns: [tick.itemId, tick.userId] })],
);

export const farmSpots = sqliteTable(
  "farm_spot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    professionEntryId: catalogReference("profession_entry_id"),
    resource: text("resource").notNull(),
    zone: text("zone").notNull(),
    coordinates: text("coordinates"),
    link: text("link"),
    notes: text("notes"),
    visibility: text("visibility", { enum: VISIBILITIES })
      .notNull()
      .default("guild"),
    createdAt: createdAt(),
  },
  (spot) => [index("farm_spot_game").on(spot.gameId)],
);

// --- Guild features (SPEC 7, Phase 3) ---

/** What a character can craft within one of its professions (SPEC 4.1 RecipeEntry). */
export const recipeEntries = sqliteTable(
  "recipe_entry",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    professionEntryId: integer("profession_entry_id")
      .notNull()
      .references(() => gameCatalogEntries.id),
    name: text("name").notNull(),
    notes: text("notes"),
  },
  (recipe) => [
    index("recipe_entry_character").on(
      recipe.characterId,
      recipe.professionEntryId,
    ),
  ],
);

export const CRAFT_REQUEST_STATUSES = ["open", "accepted", "done"] as const;
export type CraftRequestStatus = (typeof CRAFT_REQUEST_STATUSES)[number];

/** A member asks for an item; only someone with the profession may accept it. */
export const craftRequests = sqliteTable(
  "craft_request",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    professionEntryId: integer("profession_entry_id")
      .notNull()
      .references(() => gameCatalogEntries.id),
    item: text("item").notNull(),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: CRAFT_REQUEST_STATUSES })
      .notNull()
      .default("open"),
    crafterId: text("crafter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (request) => [index("craft_request_game").on(request.gameId)],
);

/** Officers' stat ranking for a class; several variants, e.g. "PvE Tank" and "PvP". */
export const statPriorities = sqliteTable(
  "stat_priority",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    classEntryId: integer("class_entry_id")
      .notNull()
      .references(() => gameCatalogEntries.id),
    title: text("title").notNull(),
    /** Most important first. */
    stats: text("stats", { mode: "json" }).$type<string[]>().notNull(),
    notes: text("notes"),
    source: text("source"),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (priority) => [index("stat_priority_class").on(priority.classEntryId)],
);

// --- Logs (SPEC 4.1) ---

export interface SyncSummary {
  added: number;
  changed: number;
  deprecated: number;
  removed: number;
  migrations: Array<{
    kind: string;
    from: string;
    to: string;
    rows_rewritten: number;
    rows_merged: number;
  }>;
  affected_characters: Array<{
    character_id: number;
    field: string;
    old_id: string;
  }>;
}

export const syncLogs = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // No foreign key: a pack that never synced successfully has no game row yet.
  gameId: text("game_id").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status", { enum: ["success", "skipped", "error"] }).notNull(),
  fromVersion: text("from_version"),
  toVersion: text("to_version"),
  summary: text("summary", { mode: "json" }).$type<SyncSummary>(),
  error: text("error"),
});

export const auditLogs = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: text("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  target: text("target"),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  at: createdAt("at"),
});
