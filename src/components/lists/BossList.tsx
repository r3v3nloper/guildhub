"use client";

import { useState, type ReactNode } from "react";
import { deleteBossAction, saveBossAction } from "@/app/dungeons/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { BossView } from "@/lib/lists/dungeon-bosses";
import { de } from "@/i18n/de";
import { BossForm } from "./BossForm";

/**
 * The bosses of a dungeon page as a fold-out list: one line per boss with what is known
 * about it, opened one by one or all at once. Editing happens in place.
 */
export function BossList({
  checklistId,
  bosses,
  canEdit,
}: {
  checklistId: number;
  bosses: BossView[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const withInfo = bosses.filter(hasInfo).length;

  const toggle = (id: number) => {
    const next = new Set(open);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setOpen(next);
  };

  return (
    <section aria-labelledby="bosses" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2
          id="bosses"
          className="font-display text-2xl font-semibold text-white"
        >
          {de.checklists.bosses}
        </h2>
        {bosses.length > 0 && (
          <span className="text-[13px] font-semibold text-muted">
            {de.checklists.withInfo(withInfo, bosses.length)}
          </span>
        )}
        {bosses.length > 1 && (
          <span className="ml-auto flex gap-1">
            <GhostButton
              onClick={() => setOpen(new Set(bosses.map((boss) => boss.id)))}
            >
              {de.checklists.expandAll}
            </GhostButton>
            <GhostButton
              onClick={() => {
                setOpen(new Set());
                setEditing(null);
              }}
            >
              {de.checklists.collapseAll}
            </GhostButton>
          </span>
        )}
      </div>

      {bosses.length === 0 ? (
        <p className="text-sm text-muted">{de.checklists.noBosses}</p>
      ) : (
        <ol className="flex flex-col gap-0.5 rounded-[22px] border border-border bg-surface p-1.5">
          {bosses.map((boss, index) => (
            <BossRow
              key={boss.id}
              boss={boss}
              number={index + 1}
              checklistId={checklistId}
              canEdit={canEdit}
              open={open.has(boss.id) || editing === boss.id}
              editing={editing === boss.id}
              onToggle={() => {
                if (editing === boss.id) {
                  setEditing(null);
                }
                toggle(boss.id);
              }}
              onEdit={() => setEditing(boss.id)}
              onEditDone={() => setEditing(null)}
            />
          ))}
        </ol>
      )}

      {canEdit &&
        (adding ? (
          <div className="flex flex-col gap-3 rounded-[22px] border border-[#2c2645] bg-surface p-5">
            <h3 className="font-display text-lg font-semibold text-white">
              {de.checklists.newBoss}
            </h3>
            <BossForm
              action={saveBossAction.bind(null, checklistId, undefined)}
              values={{ name: "", mechanics: "", loot: "" }}
              isNew
              onDone={() => setAdding(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-13 items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#3a3358] text-sm font-semibold text-accent-strong hover:bg-surface"
          >
            <i className="pi pi-plus text-xs" aria-hidden />
            {de.checklists.addBoss}
          </button>
        ))}
    </section>
  );
}

function hasInfo(boss: BossView): boolean {
  return Boolean(boss.mechanics?.trim()) || boss.loot.length > 0;
}

function BossRow({
  boss,
  number,
  checklistId,
  canEdit,
  open,
  editing,
  onToggle,
  onEdit,
  onEditDone,
}: {
  boss: BossView;
  number: number;
  checklistId: number;
  canEdit: boolean;
  open: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onEditDone: () => void;
}) {
  const mechanics = (boss.mechanics ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyId = `boss-${boss.id}`;

  return (
    <li
      className={`rounded-2xl transition-colors ${open ? "bg-[#1a1630]" : ""}`}
    >
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3.5 rounded-xl px-3 py-2 text-left hover:bg-[#1a1630]"
        >
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-chip text-[13px] font-bold text-soft tabular-nums">
            {number}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-base font-bold text-white">{boss.name}</span>
            <span className="flex flex-wrap gap-1.5">
              {mechanics.length > 0 && <Chip>{de.checklists.mechanics}</Chip>}
              {boss.loot.length > 0 && (
                <Chip>{de.checklists.lootCount(boss.loot.length)}</Chip>
              )}
              {!hasInfo(boss) && (
                <span className="text-[12.5px] text-muted">
                  {de.checklists.nothingYet}
                </span>
              )}
            </span>
          </span>
          <i
            className={`pi pi-chevron-down shrink-0 text-sm text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={de.checklists.editBossNamed(boss.name)}
            title={de.checklists.editBoss}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-foreground"
          >
            <i className="pi pi-pencil text-sm" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div id={bodyId} className="px-4 pb-4 sm:pl-[60px]">
          {editing ? (
            <div className="flex flex-col gap-3 pt-1">
              <BossForm
                action={saveBossAction.bind(null, checklistId, boss.id)}
                values={{
                  name: boss.name,
                  mechanics: boss.mechanics ?? "",
                  loot: boss.lootText,
                }}
                isNew={false}
                onDone={onEditDone}
              />
              <ActionForm
                action={deleteBossAction.bind(null, checklistId, boss.id)}
              >
                <ConfirmButton question={de.checklists.deleteBossConfirm} text>
                  {de.checklists.deleteBoss}
                </ConfirmButton>
              </ActionForm>
            </div>
          ) : hasInfo(boss) ? (
            <div className="grid gap-x-7 gap-y-4 pt-1 md:grid-cols-2">
              {mechanics.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11.5px] font-bold tracking-widest text-muted uppercase">
                    {de.checklists.mechanics}
                  </h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-4.5 text-sm leading-relaxed">
                    {mechanics.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {boss.loot.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11.5px] font-bold tracking-widest text-muted uppercase">
                    {de.checklists.loot}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {boss.loot.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col rounded-xl bg-[#241f3a]/70 px-3 py-2"
                      >
                        {entry.link ? (
                          <a
                            href={entry.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={de.checklists.openLink}
                            className="flex items-center gap-1.5 text-sm font-semibold text-accent-strong hover:text-white"
                          >
                            {entry.name}
                            <i
                              className="pi pi-external-link text-[10px]"
                              aria-hidden
                            />
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-white">
                            {entry.name}
                          </span>
                        )}
                        {entry.notes && (
                          <span className="text-[12.5px] text-muted">
                            {entry.notes}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[#2c2645] px-4 py-3">
              <span className="min-w-44 flex-1 text-sm text-muted">
                {de.checklists.nothingFor(boss.name)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="min-h-10 rounded-xl border border-[#2c2645] bg-raised px-3.5 text-[13.5px] font-semibold text-accent-strong hover:bg-chip"
                >
                  {de.checklists.fillIn}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2 py-0.5 text-[11.5px] font-semibold text-soft">
      {children}
    </span>
  );
}

function GhostButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-xl px-3 text-[13px] font-semibold text-soft hover:bg-raised hover:text-foreground"
    >
      {children}
    </button>
  );
}
