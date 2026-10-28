import type { Metadata } from "next";
import { TickItem } from "@/components/lists/TickItem";
import { VisibilityField } from "@/components/lists/VisibilityField";
import { ActionForm } from "@/components/ui/ActionForm";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Badge, Button, Card, PageHeader, TextInput } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listTodoLists, type TodoListView } from "@/lib/lists/todo-lists";
import { de } from "@/i18n/de";
import {
  addTodoItemAction,
  clearDoneItemsAction,
  createTodoListAction,
  deleteTodoItemAction,
  deleteTodoListAction,
  renameTodoListAction,
  setTodoItemDoneAction,
} from "./actions";

export const metadata: Metadata = { title: de.todos.title };

async function TodoListsContent() {
  const actor = await requireActor();
  const lists = listTodoLists(getDb(), actor);
  const sections = [
    {
      title: de.todos.guildLists,
      lists: lists.filter((list) => list.visibility === "guild"),
    },
    {
      title: de.todos.ownLists,
      lists: lists.filter((list) => list.visibility === "private"),
    },
  ].filter((section) => section.lists.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.todos.title} />
      <p className="text-sm text-muted">{de.todos.hint}</p>
      <ActionForm action={createTodoListAction}>
        <TextInput
          name="name"
          aria-label={de.todos.listName}
          placeholder={de.todos.listName}
          required
          maxLength={60}
          className="max-w-xs"
        />
        <div className="w-40">
          <VisibilityField defaultValue="private" />
        </div>
        <Button icon="pi pi-plus" label={de.todos.newList} />
      </ActionForm>
      {lists.length === 0 && <p className="text-muted">{de.todos.empty}</p>}
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {section.lists.map((list) => (
              <TodoListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TodoListCard({ list }: { list: TodoListView }) {
  const isGuild = list.visibility === "guild";
  const hasDone = list.items.some((item) => item.doneAt !== null);
  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          {list.name}
          {list.canManage && (
            <DeleteForm
              action={deleteTodoListAction.bind(null, list.id)}
              question={de.todos.deleteListConfirm}
            />
          )}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {isGuild && (
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge>{de.visibility.guild}</Badge>
            {list.ownerName}
          </span>
        )}
        {list.items.length === 0 ? (
          <p className="text-sm text-muted">{de.todos.noItems}</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.items.map((item) => (
              <TickItem
                key={item.id}
                id={`todo-${item.id}`}
                label={item.text}
                checked={item.doneAt !== null}
                meta={
                  isGuild && item.doneByName
                    ? de.todos.doneBy(item.doneByName)
                    : undefined
                }
                onToggle={setTodoItemDoneAction.bind(null, item.id)}
                onDelete={
                  item.canDelete
                    ? deleteTodoItemAction.bind(null, item.id)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
        <ActionForm action={addTodoItemAction.bind(null, list.id)}>
          <TextInput
            name="text"
            aria-label={de.todos.newItem}
            placeholder={de.todos.newItem}
            required
            maxLength={200}
            className="flex-1"
          />
          <Button icon="pi pi-plus" aria-label={de.common.add} />
        </ActionForm>
        {list.canManage && (
          <div className="flex flex-wrap items-start gap-2">
            {hasDone && (
              <ActionForm action={clearDoneItemsAction.bind(null, list.id)}>
                <Button
                  variant="secondary"
                  icon="pi pi-eraser"
                  label={de.todos.clearDone}
                />
              </ActionForm>
            )}
            <details>
              <summary className="cursor-pointer py-1.5 text-sm text-muted">
                {de.todos.rename}
              </summary>
              <ActionForm action={renameTodoListAction.bind(null, list.id)}>
                <TextInput
                  name="name"
                  aria-label={de.todos.listName}
                  defaultValue={list.name}
                  required
                  maxLength={60}
                />
                <Button icon="pi pi-check" aria-label={de.common.save} />
              </ActionForm>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function TodoListsPage() {
  return (
    <PageSuspense>
      <TodoListsContent />
    </PageSuspense>
  );
}
