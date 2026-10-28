import os from "node:os";
import path from "node:path";
import { z } from "zod";

const discordIdPattern = /^\d{17,20}$/;

export function isDiscordId(value: string): boolean {
  return discordIdPattern.test(value);
}

/** Parses a comma-separated list of Discord user IDs; blanks are ignored, duplicates removed. */
export function parseDiscordIdList(value: string | undefined): string[] {
  const ids = (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const invalid = ids.filter((id) => !isDiscordId(id));
  if (invalid.length > 0) {
    throw new Error(`Ungültige Discord-ID(s): ${invalid.join(", ")}`);
  }

  return [...new Set(ids)];
}

/**
 * Local default lies outside the project on purpose: the Next.js dev server watches the
 * project folder, and SQLite touches its files on every read, which would reload pages
 * endlessly. The container sets DATABASE_PATH=/data/guildhub.db.
 */
export const DEFAULT_DATABASE_PATH = path.join(
  os.homedir(),
  ".guildhub",
  "guildhub.db",
);

const serverEnvSchema = z.object({
  DATABASE_PATH: z.string().min(1).default(DEFAULT_DATABASE_PATH),
  OWNER_DISCORD_ID: z
    .string()
    .regex(discordIdPattern, "OWNER_DISCORD_ID ist keine Discord-ID")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  ALLOWED_DISCORD_IDS: z.string().optional(),
  GUILD_NAME: z.string().optional(),
  DEFAULT_TIMEZONE: z.string().min(1).default("Europe/Berlin"),
});

export interface ServerEnv {
  databasePath: string;
  ownerDiscordId: string | undefined;
  allowedDiscordIds: string[];
  guildName: string | undefined;
  defaultTimezone: string;
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const env = serverEnvSchema.parse(source);
  return {
    databasePath: env.DATABASE_PATH,
    ownerDiscordId: env.OWNER_DISCORD_ID,
    allowedDiscordIds: parseDiscordIdList(env.ALLOWED_DISCORD_IDS),
    guildName: env.GUILD_NAME || undefined,
    defaultTimezone: env.DEFAULT_TIMEZONE,
  };
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
