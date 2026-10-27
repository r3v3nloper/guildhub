import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { notFound } from "next/navigation";
import { AllowlistSection } from "@/components/admin/AllowlistSection";
import { AuditSection } from "@/components/admin/AuditSection";
import { GamesSection } from "@/components/admin/GamesSection";
import { MembersSection } from "@/components/admin/MembersSection";
import { PacksSection } from "@/components/admin/PacksSection";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button, Card, PageHeader, TextInput } from "@/components/ui/ui";
import { listPendingAllowlist } from "@/lib/auth/allowlist";
import { listAudit } from "@/lib/audit/audit";
import { canViewAdmin, requireActor } from "@/lib/auth/current-actor";
import { listMembers } from "@/lib/auth/membership";
import { getDb } from "@/lib/db/client";
import { listTodoEntries } from "@/lib/guild/games-admin";
import { getGuild } from "@/lib/guild/guild";
import {
  failingPacks,
  latestSyncPerGame,
  listSyncLog,
} from "@/lib/packs/status";
import { listGuildGames } from "@/lib/roster/game-catalog";
import { de } from "@/i18n/de";
import { renameGuildAction } from "./actions";

export const metadata: Metadata = { title: de.admin.title };

async function AdminContent() {
  const actor = await requireActor();
  if (!canViewAdmin(actor)) {
    notFound();
  }

  const db = getDb();
  const guild = getGuild(db);
  const members = listMembers(db, actor.guildId);
  const failing = failingPacks(db);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.admin.title} />

      {failing.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <p className="font-medium">{de.admin.packErrorBanner}</p>
          <ul className="mt-1 list-disc pl-5">
            {failing.map((entry) => (
              <li key={entry.gameId}>{entry.gameId}</li>
            ))}
          </ul>
        </div>
      )}

      <Card title={de.admin.guild}>
        <ActionForm action={renameGuildAction}>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">{de.admin.guildName}</span>
            <TextInput
              name="name"
              defaultValue={guild.name}
              required
              maxLength={60}
            />
          </label>
          <Button>{de.common.save}</Button>
        </ActionForm>
      </Card>

      <GamesSection games={listGuildGames(db, actor.guildId)} />
      <MembersSection actor={actor} members={members} />
      <AllowlistSection pending={listPendingAllowlist(db)} />
      <PacksSection
        latest={latestSyncPerGame(db)}
        history={listSyncLog(db)}
        todoEntries={listTodoEntries(db)}
      />
      <AuditSection
        entries={listAudit(db)}
        memberNames={
          new Map(members.map((member) => [member.userId, member.name]))
        }
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <PageSuspense>
      <AdminContent />
    </PageSuspense>
  );
}
