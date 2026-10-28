import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DateTime } from "luxon";
import { MatrixTable } from "@/components/guild/MatrixTable";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Card, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import { buildGameMatrix, type MatrixMode } from "@/lib/guild/matrix";
import { loadGuildTaskItems, type DashboardItem } from "@/lib/tasks/dashboard";
import { localize } from "@/i18n/localize";
import { textParam } from "@/lib/search-params";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.matrix.title };

const CHARACTER_MODE = "charakter";

async function MatrixContent({ searchParams }: PageProps<"/matrix">) {
  const actor = await requireActor();
  const params = await searchParams;
  const mode: MatrixMode =
    params.ansicht === CHARACTER_MODE ? "character" : "member";
  const category = textParam(params.kategorie);
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const now = DateTime.now();
  const guildTasks = loadGuildTaskItems(
    db,
    actor.guildId,
    games.map((game) => game.id),
    now,
  );
  const href = (next: { mode?: MatrixMode; category?: string | null }) => {
    const query = new URLSearchParams();
    if ((next.mode ?? mode) === "character") {
      query.set("ansicht", CHARACTER_MODE);
    }
    const nextCategory = next.category === undefined ? category : next.category;
    if (nextCategory) {
      query.set("kategorie", nextCategory);
    }
    const text = query.toString();
    return text ? `/matrix?${text}` : "/matrix";
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={de.matrix.title}
        actions={
          <span className="flex gap-1 text-sm">
            <ModeLink
              href={href({ mode: "member" })}
              active={mode === "member"}
            >
              {de.matrix.perMember}
            </ModeLink>
            <ModeLink
              href={href({ mode: "character" })}
              active={mode === "character"}
            >
              {de.matrix.perCharacter}
            </ModeLink>
          </span>
        }
      />
      {guildTasks.length > 0 && <GuildTasks items={guildTasks} />}
      {games.length === 0 && <p className="text-muted">{de.home.noGames}</p>}
      {games.map((game) => {
        const matrix = buildGameMatrix(
          db,
          actor.guildId,
          game.id,
          mode,
          category,
          now,
        );
        return (
          <Card key={game.id} title={localize(game.name)}>
            <div className="flex flex-col gap-3">
              {matrix.categories.length > 0 && (
                <span className="flex flex-wrap gap-1 text-sm">
                  <ModeLink href={href({ category: null })} active={!category}>
                    {de.common.all}
                  </ModeLink>
                  {matrix.categories.map((name) => (
                    <ModeLink
                      key={name}
                      href={href({ category: name })}
                      active={category === name}
                    >
                      {name}
                    </ModeLink>
                  ))}
                </span>
              )}
              <MatrixTable matrix={matrix} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ModeLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md border px-2 py-1 ${active ? "border-accent text-accent" : "border-border text-muted hover:text-accent"}`}
    >
      {children}
    </Link>
  );
}

/** Guild-wide tasks are ticked once for everyone, so they need no columns. */
function GuildTasks({ items }: { items: DashboardItem[] }) {
  return (
    <Card title={de.matrix.guildTasks}>
      <ul className="divide-y divide-border text-sm">
        {items.map((item) => (
          <li
            key={item.taskId}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <span>{item.title}</span>
            <span
              className={
                item.status === "done" ? "text-green-600" : "text-muted"
              }
            >
              {item.kind === "counter" && item.cap
                ? `${item.value}/${item.cap}`
                : item.status === "done"
                  ? "✓"
                  : "–"}
              {item.doneBy && ` · ${item.doneBy}`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function MatrixPage(props: PageProps<"/matrix">) {
  return (
    <PageSuspense>
      <MatrixContent {...props} />
    </PageSuspense>
  );
}
