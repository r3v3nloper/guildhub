import Link from "next/link";
import type { ReactNode } from "react";
import {
  resetChecklistRunAction,
  setChecklistItemTickedAction,
} from "@/app/dungeons/actions";
import { setTodoItemDoneAction } from "@/app/listen/actions";
import { TickItem } from "@/components/lists/TickItem";
import { ActionForm } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/ui";
import type { ChecklistView } from "@/lib/lists/checklists";
import type { TodoListView } from "@/lib/lists/todo-lists";
import { de } from "@/i18n/de";

/**
 * Open to-dos and pinned dungeon checklists on the dashboard, so nobody has to switch
 * pages to see what is left. Ticking works right here; managing stays on the list pages.
 */
export function TodayLists({
  todoLists,
  checklists,
}: {
  todoLists: TodoListView[];
  checklists: ChecklistView[];
}) {
  const openLists = todoLists
    .map((list) => ({
      ...list,
      items: list.items.filter((item) => item.doneAt === null),
    }))
    .filter((list) => list.items.length > 0);
  if (openLists.length === 0 && checklists.length === 0) {
    return null;
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {checklists.map((checklist) => (
        <ChecklistCard key={`c${checklist.id}`} checklist={checklist} />
      ))}
      {openLists.map((list) => (
        <ListCard
          key={`t${list.id}`}
          icon="pi-list"
          kind={
            list.visibility === "guild"
              ? de.today.guildTodoList
              : de.today.todoList
          }
          title={list.name}
          href="/listen"
          meta={de.today.openEntries(list.items.length)}
        >
          <ul className="divide-y divide-border">
            {list.items.map((item) => (
              <TickItem
                key={item.id}
                id={`today-todo-${item.id}`}
                label={item.text}
                checked={false}
                onToggle={setTodoItemDoneAction.bind(null, item.id)}
              />
            ))}
          </ul>
        </ListCard>
      ))}
    </div>
  );
}

function ChecklistCard({ checklist }: { checklist: ChecklistView }) {
  const ticked = checklist.items.filter((item) => item.ticked).length;
  return (
    <ListCard
      icon="pi-flag"
      kind={de.today.checklist}
      title={checklist.name}
      href={`/dungeons/${checklist.id}`}
      meta={de.checklists.progress(ticked, checklist.items.length)}
    >
      <ul className="divide-y divide-border">
        {checklist.items.map((item) => (
          <TickItem
            key={item.id}
            id={`today-checklist-${item.id}`}
            label={item.label}
            checked={item.ticked}
            onToggle={setChecklistItemTickedAction.bind(null, item.id)}
          />
        ))}
      </ul>
      {ticked > 0 && (
        <div className="px-3 pt-2">
          <ActionForm action={resetChecklistRunAction.bind(null, checklist.id)}>
            <Button
              variant="secondary"
              icon="pi pi-refresh"
              label={de.checklists.newRun}
            />
          </ActionForm>
        </div>
      )}
    </ListCard>
  );
}

function ListCard({
  icon,
  kind,
  title,
  href,
  meta,
  children,
}: {
  icon: string;
  kind: string;
  title: string;
  href: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-border bg-surface px-2 pt-4 pb-2 md:px-3">
      <header className="mb-1 flex items-start justify-between gap-2 border-b border-border px-3 pb-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-muted uppercase">
            <i className={`pi ${icon} text-accent`} aria-hidden />
            {kind}
          </span>
          <h3 className="truncate text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[13px] font-bold tabular-nums">{meta}</span>
          <Link
            href={href}
            className="text-xs font-semibold text-accent-strong hover:text-white"
          >
            {de.today.manage}
          </Link>
        </div>
      </header>
      {children}
    </section>
  );
}
