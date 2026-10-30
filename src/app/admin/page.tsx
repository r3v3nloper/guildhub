import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { notFound } from "next/navigation";
import { AllowlistSection } from "@/components/admin/AllowlistSection";
import { AuditSection } from "@/components/admin/AuditSection";
import { GamesSection } from "@/components/admin/GamesSection";
import { MembersSection } from "@/components/admin/MembersSection";
import { PacksSection } from "@/components/admin/PacksSection";
import { ActionForm } from "@/components/ui/ActionForm";
import {
  Button,
  ButtonLink,
  Card,
  PageHeader,
  TextInput,
} from "@/components/ui/ui";
import { listPendingAllowlist } from "@/lib/auth/allowlist";
import { listAudit } from "@/lib/audit/audit";
import { canViewAdmin, requireActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
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
      <nav
        aria-label={de.admin.sectionsLabel}
        className="-mx-4 -mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
      >
        {[
          ["gilde", de.admin.guild],
          ["spiele", de.admin.games],
          ["mitglieder", de.admin.members],
          ["allowlist", de.admin.allowlist],
          ["packs", de.admin.packs],
          ...(permissions.downloadBackup(actor).allowed
            ? [["backup", de.admin.backup]]
            : []),
          ["protokoll", de.admin.audit],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex min-h-9 shrink-0 items-center rounded-full border border-[#2c2645] bg-raised px-3.5 text-[13px] font-semibold text-foreground hover:border-[#3a3358] hover:text-white"
          >
            {label}
          </a>
        ))}
      </nav>

      {failing.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-red-800 bg-red-950 p-3 text-sm text-red-200"
        >
          <p className="font-medium">{de.admin.packErrorBanner}</p>
          <ul className="mt-1 list-disc pl-5">
            {failing.map((entry) => (
              <li key={entry.gameId}>{entry.gameId}</li>
            ))}
          </ul>
        </div>
      )}

      <div id="gilde" className="scroll-mt-6">
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
      </div>

      <div id="spiele" className="scroll-mt-6">
        <GamesSection games={listGuildGames(db, actor.guildId)} />
      </div>
      <div id="mitglieder" className="scroll-mt-6">
        <MembersSection actor={actor} members={members} />
      </div>
      <div id="allowlist" className="scroll-mt-6">
        <AllowlistSection pending={listPendingAllowlist(db)} />
      </div>
      <div id="packs" className="scroll-mt-6">
        <PacksSection
          latest={latestSyncPerGame(db)}
          history={listSyncLog(db)}
          todoEntries={listTodoEntries(db)}
        />
      </div>
      {permissions.downloadBackup(actor).allowed && (
        <div id="backup" className="scroll-mt-6">
          <Card title={de.admin.backup}>
            <p className="mb-3 text-sm text-muted">{de.admin.backupHint}</p>
            <ButtonLink href="/admin/backup" variant="secondary">
              {de.admin.backupDownload}
            </ButtonLink>
          </Card>
        </div>
      )}
      <div id="protokoll" className="scroll-mt-6">
        <AuditSection
          entries={listAudit(db)}
          memberNames={
            new Map(members.map((member) => [member.userId, member.name]))
          }
        />
      </div>
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
