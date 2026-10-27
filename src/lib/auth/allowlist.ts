import type { ServerEnv } from "@/lib/env";

// Phase 0: ENV only. Phase 1 replaces this with the AllowlistEntry table (SPEC 7.2),
// where the ENV values are merely seeded into the DB.
export function isDiscordIdAllowed(
  discordId: string,
  env: Pick<ServerEnv, "ownerDiscordId" | "allowedDiscordIds">,
): boolean {
  return (
    discordId === env.ownerDiscordId ||
    env.allowedDiscordIds.includes(discordId)
  );
}
