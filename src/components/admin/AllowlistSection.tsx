import { admitAction, revokeAllowlistAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { Badge, Button, Card, TextInput } from "@/components/ui/ui";
import type { AllowlistEntry } from "@/lib/auth/allowlist";
import { de } from "@/i18n/de";

export function AllowlistSection({ pending }: { pending: AllowlistEntry[] }) {
  return (
    <Card title={de.admin.allowlist}>
      <ActionForm action={admitAction}>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">{de.admin.allowlistAdd}</span>
          <TextInput
            name="discordId"
            inputMode="numeric"
            pattern="\d{17,20}"
            required
            placeholder="418171274456727564"
          />
        </label>
        <Button>{de.common.add}</Button>
      </ActionForm>
      <p className="mt-2 text-xs text-zinc-500">{de.admin.allowlistHint}</p>

      {pending.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium">
            {de.admin.allowlistPending}
          </h3>
          <ul className="flex flex-col gap-2">
            {pending.map((entry) => (
              <li
                key={entry.discordId}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span className="tabular-nums">{entry.discordId}</span>
                {entry.source === "env" && <Badge>ENV</Badge>}
                <ActionForm
                  action={revokeAllowlistAction.bind(null, entry.discordId)}
                >
                  <Button variant="secondary">{de.common.delete}</Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
