"use client";

import { InputNumber } from "primereact/inputnumber";
import { useOptimistic, useState } from "react";
import type { DashboardItem } from "@/lib/tasks/dashboard";
import { Button } from "@/components/ui/ui";
import { formatCountdown } from "@/i18n/format";
import { de } from "@/i18n/de";
import { ItemShell } from "./ItemShell";
import { consumeStackingAction, setResourceValueAction } from "./today-actions";
import { useLongPress } from "./use-long-press";
import { useOptimisticAction } from "@/components/ui/use-optimistic-action";

/**
 * regen and stacking (SPEC 5.3). Stacking: tap = one used, long press or pencil = exact
 * value. Regen: tap opens the value field, prefilled with the projection.
 */
export function ResourceTask({
  item,
  now,
}: {
  item: DashboardItem;
  now: string;
}) {
  const resource = item.resource!;
  const [value, setValue] = useOptimistic(resource.value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(value);
  const { pending, error, run } = useOptimisticAction();
  const target = { taskId: item.taskId, characterId: item.characterId };
  const unknown = value === null;

  const openEditor = () => {
    setDraft(value ?? 0);
    setEditing(true);
  };
  const tap =
    item.kind === "stacking" && !unknown
      ? () => {
          if (value === 0) {
            return;
          }
          run(
            () => consumeStackingAction(target),
            () => setValue(value - 1),
          );
        }
      : openEditor;
  const press = useLongPress(
    tap,
    item.kind === "stacking" ? openEditor : undefined,
  );
  const save = () => {
    if (draft === null) {
      return;
    }
    setEditing(false);
    run(
      () => setResourceValueAction(target, draft),
      () => setValue(draft),
    );
  };

  return (
    <ItemShell
      {...item}
      pending={pending}
      error={error}
      pressHandlers={press}
      pressLabel={
        unknown
          ? `${item.title}: ${de.today.enterValue}`
          : `${item.title}: ${value} / ${resource.cap}`
      }
      indicator={
        <span
          className={`rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ${item.status === "open" ? "bg-orange-500/20 text-orange-600" : "bg-border"}`}
        >
          {unknown ? "?" : value}/{resource.cap}
        </span>
      }
      meta={<ResourceHint item={item} now={now} />}
      actions={
        item.kind === "stacking" &&
        !unknown && (
          <Button
            type="button"
            variant="secondary"
            icon="pi pi-pencil"
            aria-label={de.today.editValue}
            title={de.today.editValue}
            onClick={openEditor}
          />
        )
      }
    >
      {editing && (
        <form
          className="ml-14 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <InputNumber
            aria-label={de.today.currentValue}
            value={draft}
            min={0}
            max={resource.cap}
            onValueChange={(event) => setDraft(event.value ?? null)}
            autoFocus
            inputClassName="w-24"
          />
          <Button icon="pi pi-check" aria-label={de.common.save} />
          <Button
            type="button"
            variant="secondary"
            icon="pi pi-times"
            aria-label={de.common.cancel}
            onClick={() => setEditing(false)}
          />
        </form>
      )}
    </ItemShell>
  );
}

function ResourceHint({ item, now }: { item: DashboardItem; now: string }) {
  const resource = item.resource!;
  if (resource.value === null) {
    return <span>{de.today.enterValue}</span>;
  }
  if (item.status === "open") {
    return <span className="text-orange-600">{de.today.full}</span>;
  }
  if (resource.fullAt) {
    return (
      <span>{de.today.fullIn(formatCountdown(resource.fullAt, now))}</span>
    );
  }
  return null;
}
