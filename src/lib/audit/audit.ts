import { desc, eq } from "drizzle-orm";
import type { AppDatabase, DbExecutor } from "@/lib/db/client";
import { auditLogs, users } from "@/lib/db/schema";

export const AUDIT_ACTIONS = [
  "allowlist.add",
  "allowlist.remove",
  "member.disable",
  "member.reactivate",
  "member.role",
  "member.purge",
  "guild.rename",
  "game.enable",
  "game.disable",
  "game.region",
  "backup.download",
  "guildTask.create",
  "guildTask.update",
  "guildTask.delete",
  "craftRequest.delete",
  "statPriority.create",
  "statPriority.update",
  "statPriority.delete",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntry = typeof auditLogs.$inferSelect;

export function recordAudit(
  db: DbExecutor,
  actorUserId: string,
  action: AuditAction,
  target: string,
  details: Record<string, unknown> = {},
): void {
  db.insert(auditLogs).values({ actorUserId, action, target, details }).run();
}

export interface AuditView extends AuditEntry {
  actorName: string | null;
}

export function listAudit(db: AppDatabase, limit = 100): AuditView[] {
  return db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      target: auditLogs.target,
      details: auditLogs.details,
      at: auditLogs.at,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.at), desc(auditLogs.id))
    .limit(limit)
    .all();
}
