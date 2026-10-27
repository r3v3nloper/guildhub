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
