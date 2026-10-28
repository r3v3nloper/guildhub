import { setGameEnabledAction, setGameRegionAction } from "@/app/admin/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { Badge, Button, Card, Select } from "@/components/ui/ui";
import type { GuildGameInfo } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export function GamesSection({ games }: { games: GuildGameInfo[] }) {
  return (
    <Card title={de.admin.games}>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {games.map((game) => (
          <li
            key={game.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{localize(game.name)}</span>
              <span className="text-xs text-zinc-500">
                {de.admin.packVersion} {game.packVersion}
              </span>
              <Badge tone={game.enabled ? "accent" : "neutral"}>
                {game.enabled ? de.admin.enabled : de.admin.disabled}
              </Badge>
              {game.lastSyncError && (
                <Badge tone="danger">{de.admin.packErrorBadge}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-start gap-3">
              {game.meta.regions.length > 1 && (
                <ActionForm action={setGameRegionAction.bind(null, game.id)}>
                  <Select
                    name="region"
                    defaultValue={game.regionId ?? ""}
                    aria-label={de.admin.region}
                    className="w-auto"
                  >
                    {game.meta.regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {localize(region.name) || region.id}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary">{de.common.save}</Button>
                </ActionForm>
              )}
              {game.meta.regions.length === 1 && (
                <span className="text-sm text-zinc-500">
                  {de.admin.region}:{" "}
                  {localize(game.meta.regions[0].name) ||
                    game.meta.regions[0].id}
                </span>
              )}
              <ActionForm
                action={setGameEnabledAction.bind(null, game.id, !game.enabled)}
              >
                <Button variant={game.enabled ? "secondary" : "primary"}>
                  {game.enabled ? de.admin.disable : de.admin.enable}
                </Button>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
