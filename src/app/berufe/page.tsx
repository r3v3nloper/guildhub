import type { Metadata } from "next";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { SelectField } from "@/components/ui/SelectField";
import { Badge, Button, Card, PageHeader, TextInput } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import {
  loadProfessionDirectory,
  type DirectoryProfession,
  type DirectoryRecipe,
} from "@/lib/roster/profession-directory";
import { PackCredits } from "@/components/packs/PackCredits";
import { loadGameCatalog, selectableOfKind } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { textParam } from "@/lib/search-params";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.directory.title };

async function DirectoryContent({ searchParams }: PageProps<"/berufe">) {
  const actor = await requireActor();
  const params = await searchParams;
  const query = textParam(params.suche) ?? "";
  const professionKey = textParam(params.beruf) ?? "";
  const db = getDb();
  const { games, selectedId } = await selectedGames(db, actor.guildId);
  const withProfessions = games.filter(
    (game) => game.meta.capabilities.professions,
  );
  // The profession filter needs one game: keys are only unique within a game.
  const catalog = selectedId ? loadGameCatalog(db, selectedId) : undefined;
  const professionOptions = catalog
    ? selectableOfKind(catalog, "profession").map((entry) => ({
        value: entry.key,
        label: localize(entry.name),
      }))
    : [];
  const directory = loadProfessionDirectory(
    db,
    actor.guildId,
    withProfessions.map((game) => game.id),
    { query, professionKey: catalog ? professionKey || undefined : undefined },
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={de.directory.title} />
      <form className="flex flex-wrap items-end gap-2" method="get">
        <TextInput
          name="suche"
          defaultValue={query}
          placeholder={de.directory.searchPlaceholder}
          aria-label={de.directory.search}
          className="max-w-xs"
        />
        {professionOptions.length > 0 && (
          <div className="w-48">
            <SelectField
              name="beruf"
              defaultValue={professionKey}
              emptyLabel={de.directory.allProfessions}
              options={professionOptions}
              aria-label={de.farmSpots.profession}
            />
          </div>
        )}
        <Button icon="pi pi-search" label={de.directory.search} />
      </form>
      {withProfessions.length === 0 && (
        <p className="text-muted">{de.directory.noProfessions}</p>
      )}
      {withProfessions.length > 0 && directory.length === 0 && (
        <p className="text-muted">{de.directory.empty}</p>
      )}
      {withProfessions.map((game) => {
        const ofGame = directory.filter(
          (profession) => profession.gameId === game.id,
        );
        if (ofGame.length === 0) {
          return null;
        }
        return (
          <section key={game.id} className="flex flex-col gap-3">
            {withProfessions.length > 1 && (
              <h2 className="text-lg font-semibold">{localize(game.name)}</h2>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {ofGame.map((profession) => (
                <ProfessionCard key={profession.key} profession={profession} />
              ))}
            </div>
            <PackCredits meta={game.meta} label={de.directory.credits} />
          </section>
        );
      })}
    </div>
  );
}

function ProfessionCard({ profession }: { profession: DirectoryProfession }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {localize(profession.name)}
          <Badge>
            {de.professionKinds[profession.kind] ?? profession.kind}
          </Badge>
        </span>
      }
    >
      <ul className="divide-y divide-border">
        {profession.crafters.map((crafter) => (
          <li key={crafter.characterId} className="flex flex-col gap-1 py-2">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{crafter.characterName}</span>
              <span className="text-sm text-muted">{crafter.memberName}</span>
              {crafter.skillLevel !== null && (
                <span className="text-sm tabular-nums">
                  {crafter.skillLevel}
                </span>
              )}
              {crafter.specialization && (
                <span className="text-sm">({crafter.specialization})</span>
              )}
            </span>
            {crafter.notes && (
              <span className="text-sm text-muted">{crafter.notes}</span>
            )}
            {crafter.recipes.length > 0 && (
              <ul className="ml-4 list-disc text-sm">
                {crafter.recipes.map((recipe) => (
                  <RecipeItem key={recipe.name} recipe={recipe} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecipeItem({ recipe }: { recipe: DirectoryRecipe }) {
  return (
    <li>
      {recipe.name}
      {recipe.skill !== null && (
        <span className="text-muted tabular-nums">
          {" "}
          ({de.characters.recipeFromSkill} {recipe.skill})
        </span>
      )}
      {recipe.notes && <span className="text-muted"> – {recipe.notes}</span>}
      {recipe.reagents && (
        <span className="block text-xs text-muted">
          {de.directory.reagents}: {recipe.reagents}
        </span>
      )}
    </li>
  );
}

export default function DirectoryPage(props: PageProps<"/berufe">) {
  return (
    <PageSuspense>
      <DirectoryContent {...props} />
    </PageSuspense>
  );
}
