import type { Metadata } from "next";
import { TickItem } from "@/components/lists/TickItem";
import { ActionForm } from "@/components/ui/ActionForm";
import { DeleteForm } from "@/components/ui/DeleteForm";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Button, Card, PageHeader, TextInput } from "@/components/ui/ui";
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
  setTodoItemDoneAction,
} from "./actions";

export const metadata: Metadata = { title: de.todos.title };

async function TodoListsContent() {
  const actor = await requireActor();
  const lists = listTodoLists(getDb(), actor.userId);

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
        <Button icon="pi pi-plus" label={de.todos.newList} />
      </ActionForm>
      {lists.length === 0 && <p className="text-muted">{de.todos.empty}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {lists.map((list) => (
          <TodoListCard key={list.id} list={list} />
        ))}
      </div>
    </div>
  );
}

function TodoListCard({ list }: { list: TodoListView }) {
  const hasDone = list.items.some((item) => item.doneAt !== null);
  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          {list.name}
          <DeleteForm
            action={deleteTodoListAction.bind(null, list.id)}
            question={de.todos.deleteListConfirm}
          />
        </span>
      }
    >
      <div className="flex flex-col gap-3">
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
                onToggle={setTodoItemDoneAction.bind(null, item.id)}
                onDelete={deleteTodoItemAction.bind(null, item.id)}
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
        {hasDone && (
          <ActionForm action={clearDoneItemsAction.bind(null, list.id)}>
            <Button
              variant="secondary"
              icon="pi pi-eraser"
              label={de.todos.clearDone}
            />
          </ActionForm>
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
