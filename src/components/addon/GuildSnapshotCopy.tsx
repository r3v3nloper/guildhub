"use client";

import { useState, useTransition } from "react";
import { Button, FormMessage, TextArea } from "@/components/ui/ui";
import type { ActionState } from "@/lib/actions/action-state";
import { de } from "@/i18n/de";

/**
 * "Für das Addon kopieren": fetches the guild snapshot and puts it on the clipboard.
 * Where the browser refuses the clipboard, the text is shown for copying by hand.
 */
export function GuildSnapshotCopy({
  load,
}: {
  load: () => Promise<ActionState & { text?: string }>;
}) {
  const texts = de.addonImport;
  const [state, setState] = useState<ActionState>({});
  const [manualText, setManualText] = useState<string>();
  const [pending, startTransition] = useTransition();

  const copy = () =>
    startTransition(async () => {
      const result = await load();
      if (!result.ok || result.text === undefined) {
        setState(result);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.text);
        setManualText(undefined);
        setState({ ok: true, message: texts.snapshotCopied });
      } catch {
        setManualText(result.text);
        setState({ ok: false, message: texts.snapshotManual });
      }
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-white">{texts.snapshotTitle}</h2>
      <p className="text-sm text-soft">{texts.snapshotIntro}</p>
      <div>
        <Button
          type="button"
          variant="secondary"
          icon="pi pi-copy"
          label={texts.snapshotCopy}
          disabled={pending}
          loading={pending}
          onClick={copy}
        />
      </div>
      <FormMessage state={state} />
      {manualText !== undefined && (
        <TextArea
          name="snapshot"
          aria-label={texts.snapshotTitle}
          rows={4}
          autoResize={false}
          readOnly
          value={manualText}
          onFocus={(event) => event.currentTarget.select()}
          className="font-mono text-xs"
        />
      )}
    </section>
  );
}
