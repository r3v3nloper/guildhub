import { z } from "zod";

const discordIdPattern = /^\d{17,20}$/;

/** Parses a comma-separated list of Discord user IDs; blanks are ignored, duplicates removed. */
export function parseDiscordIdList(value: string | undefined): string[] {
  const ids = (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  const invalid = ids.filter((id) => !discordIdPattern.test(id));
  if (invalid.length > 0) {
    throw new Error(`Ungültige Discord-ID(s): ${invalid.join(", ")}`);
  }

  return [...new Set(ids)];
}

const serverEnvSchema = z.object({
  DATABASE_PATH: z.string().min(1).default("./data/guildhub.db"),
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
