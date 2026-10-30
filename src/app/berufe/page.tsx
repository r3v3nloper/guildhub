import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClassAvatar } from "@/components/characters/ClassAvatar";
import { PackCredits } from "@/components/packs/PackCredits";
import { RecipeSearchInput } from "@/components/professions/RecipeSearchInput";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { ButtonLink, PageHeader } from "@/components/ui/ui";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { selectedGames } from "@/lib/game-filter";
import {
  findRecipes,
  lookupRecipe,
  type RecipeCrafter,
  type RecipeLookup,
  type RecipeMatch,
} from "@/lib/guild/craft-requests";
import {
  listProfessions,
  loadProfessionDirectory,
  type Crafter,
  type ProfessionSummary,
} from "@/lib/roster/profession-directory";
import { idSearchParam, textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.directory.title };

const KIND_ORDER = ["primary", "secondary", "gathering"];

/** Where this page is, with the parameters given (empty ones left out). */
function berufeHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(name, String(value));
    }
  }
  const text = search.toString();
  return text ? `/berufe?${text}` : "/berufe";
}

/**
 * "Wer kann X?" (SPEC 7, item 6): a recipe search over the packs that answers with the
 * guild's crafters (by skill, like crafting requests do), then every profession as a
 * tile (also the ones nobody has) and the picked profession's people.
 */
async function DirectoryContent({ searchParams }: PageProps<"/berufe">) {
  const actor = await requireActor();
  const params = await searchParams;
  const query = textParam(params.suche) ?? "";
  const db = getDb();
  const { games } = await selectedGames(db, actor.guildId);
  const withProfessions = games.filter(
    (game) => game.meta.capabilities.professions,
  );
  const gameIds = withProfessions.map((game) => game.id);
  const professions = listProfessions(db, gameIds);
  const directory = loadProfessionDirectory(db, actor.guildId, gameIds);
  const crafterOf = (profession: ProfessionSummary) =>
    directory.find(
      (entry) =>
        entry.gameId === profession.gameId && entry.key === profession.key,
    )?.crafters ?? [];

  const matches = findRecipes(db, actor, gameIds, query);
  const recipeId = idSearchParam(params.rezept) ?? matches[0]?.id;
  const recipe =
    recipeId === undefined ? null : lookupRecipe(db, actor, gameIds, recipeId);
  const requestedProfession = idSearchParam(params.beruf);
  const selected =
    professions.find((profession) => profession.id === requestedProfession) ??
    professions.find((profession) =>
      crafterOf(profession).some((crafter) => crafter.userId === actor.userId),
    );
  const recipeTotal = professions.reduce(
    (sum, profession) => sum + profession.recipeCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={de.directory.title}
        eyebrow={
          withProfessions.length === 1
            ? localize(withProfessions[0].name)
            : undefined
        }
        meta={<p className="text-sm text-muted">{de.directory.intro}</p>}
      />
      {withProfessions.length === 0 && (
        <p className="text-muted">{de.directory.noProfessions}</p>
      )}
      {withProfessions.length > 0 && (
        <section className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-surface p-5">
          <RecipeSearchInput
            initialQuery={query}
            keep={selected ? { beruf: String(selected.id) } : {}}
            hint={recipeTotal > 0 ? de.directory.recipeCount(recipeTotal) : ""}
          />
          {matches.length > 1 && (
            <ul className="flex flex-wrap gap-1.5">
              {matches.map((match) => (
                <li key={match.id}>
                  <MatchChip
                    match={match}
                    active={match.id === recipe?.id}
                    href={berufeHref({
                      suche: query,
                      rezept: match.id,
                      beruf: selected?.id,
                    })}
                  />
                </li>
              ))}
            </ul>
          )}
          {recipe ? (
            <RecipeResult recipe={recipe} actorId={actor.userId} />
          ) : (
            query && (
              <p className="rounded-[18px] border border-dashed border-[#2c2645] px-4.5 py-4 text-sm text-muted">
                {de.directory.noRecipe}
              </p>
            )
          )}
        </section>
      )}

      {withProfessions.map((game) => (
        <ProfessionTiles
          key={game.id}
          gameName={
            withProfessions.length > 1 ? localize(game.name) : undefined
          }
          professions={professions.filter(
            (profession) => profession.gameId === game.id,
          )}
          crafterOf={crafterOf}
          actorId={actor.userId}
          selectedId={selected?.id}
          hrefFor={(profession) =>
            berufeHref({
              suche: query,
              rezept: params.rezept ? recipe?.id : undefined,
              beruf: profession.id,
            })
          }
        />
      ))}

      {selected && (
        <ProfessionDetail
          profession={selected}
          crafters={crafterOf(selected)}
          actorId={actor.userId}
        />
      )}

      {withProfessions.map((game) => (
        <PackCredits
          key={game.id}
          meta={game.meta}
          label={de.directory.credits}
        />
      ))}
    </div>
  );
}

function MatchChip({
  match,
  active,
  href,
}: {
  match: RecipeMatch;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
        active
          ? "border-[#6e58c8] bg-accent-soft font-bold text-white"
          : "border-[#2c2645] bg-raised font-semibold text-foreground hover:border-[#3a3358]"
      }`}
    >
      {match.name}
      <span className="font-medium text-muted">· {match.professionName}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
      {children}
    </span>
  );
}

function RecipeResult({
  recipe,
  actorId,
}: {
  recipe: RecipeLookup;
  actorId: string;
}) {
  const able = recipe.crafters.filter(
    (crafter) => crafter.ability === "recipe" || crafter.ability === "skill",
  );
  const maybe = recipe.crafters.filter(
    (crafter) => crafter.ability === "unknown",
  );
  const tooLow = recipe.crafters.filter(
    (crafter) => crafter.ability === "tooLow",
  );
  const requestHref = `/antraege?${new URLSearchParams({
    neu: "1",
    spiel: recipe.gameId,
    beruf: recipe.professionKey,
    rezept: recipe.key,
  }).toString()}`;

  return (
    <article
      aria-live="polite"
      className="flex flex-col gap-4 rounded-[18px] border border-[#2c2645] bg-raised p-4 md:p-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
        <h2 className="font-display text-2xl font-semibold text-white">
          {recipe.name}
        </h2>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-[#d9ccff]">
          {recipe.professionName}
        </span>
        {recipe.skill !== null && recipe.skill > 0 && (
          <span className="text-sm text-muted">
            {de.directory.fromSkill(recipe.skill)}
          </span>
        )}
        {recipe.link && (
          <a
            href={recipe.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-accent-strong hover:text-white"
          >
            {de.directory.openSource}
            <i className="pi pi-external-link text-[10px]" aria-hidden />
          </a>
        )}
      </div>
      {recipe.reagents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1">
            <SectionLabel>{de.directory.reagents}</SectionLabel>
          </span>
          {recipe.reagents.map((reagent) => (
            <span
              key={reagent.name}
              className="rounded-full bg-chip px-2.5 py-1 text-[12.5px] font-semibold text-soft"
            >
              {reagent.count}× {reagent.name}
            </span>
          ))}
        </div>
      )}
      <CrafterGroup
        label={de.directory.canCraft(able.length)}
        crafters={able}
        actorId={actorId}
        empty={de.directory.nobodyCan}
      />
      {maybe.length > 0 && (
        <CrafterGroup
          label={de.directory.maybe(maybe.length)}
          crafters={maybe}
          actorId={actorId}
        />
      )}
      {tooLow.length > 0 && (
        <CrafterGroup
          label={de.directory.tooLow(tooLow.length)}
          crafters={tooLow}
          actorId={actorId}
          required={recipe.skill}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={requestHref}>{de.directory.request}</ButtonLink>
        <span className="text-[13px] text-muted">
          {de.directory.requestHint}
        </span>
      </div>
    </article>
  );
}

function CrafterGroup({
  label,
  crafters,
  actorId,
  empty,
  required = null,
}: {
  label: string;
  crafters: RecipeCrafter[];
  actorId: string;
  empty?: string;
  required?: number | null;
}) {
  return (
    <div className="flex flex-col">
      <span className="pb-1.5">
        <SectionLabel>{label}</SectionLabel>
      </span>
      {crafters.length === 0 ? (
        <p className="text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {crafters.map((crafter) => (
            <li
              key={crafter.characterId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span className="font-bold text-white">
                  {crafter.characterName}
                </span>
                <span className="text-muted">{crafter.userName}</span>
                {crafter.userId === actorId && <YouBadge />}
              </span>
              <span className="text-[13px] text-soft tabular-nums">
                {crafter.skill ?? "–"}
              </span>
              <AbilityLabel crafter={crafter} required={required} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AbilityLabel({
  crafter,
  required,
}: {
  crafter: RecipeCrafter;
  required: number | null;
}) {
  switch (crafter.ability) {
    case "recipe":
      return (
        <span className="text-[13px] font-bold text-success">
          ✓ {de.directory.hasRecipe}
        </span>
      );
    case "skill":
      return (
        <span className="text-[13px] font-bold text-success">
          ✓ {de.directory.can}
        </span>
      );
    case "unknown":
      return (
        <span className="text-[13px] font-semibold text-warning">
          {de.directory.skillMissing}
        </span>
      );
    default:
      return (
        <span className="text-[13px] font-semibold text-muted">
          {required === null ? "" : de.directory.needs(required)}
        </span>
      );
  }
}

function YouBadge() {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-[#d9ccff]">
      {de.directory.you}
    </span>
  );
}

function ProfessionTiles({
  gameName,
  professions,
  crafterOf,
  actorId,
  selectedId,
  hrefFor,
}: {
  gameName?: string;
  professions: ProfessionSummary[];
  crafterOf: (profession: ProfessionSummary) => Crafter[];
  actorId: string;
  selectedId: number | undefined;
  hrefFor: (profession: ProfessionSummary) => string;
}) {
  const kinds = [
    ...KIND_ORDER,
    ...new Set(professions.map((profession) => profession.kind)),
  ].filter(
    (kind, index, all) =>
      all.indexOf(kind) === index &&
      professions.some((profession) => profession.kind === kind),
  );
  return (
    <section className="flex flex-col gap-3">
      {gameName && (
        <h2 className="font-display text-xl font-semibold text-white">
          {gameName}
        </h2>
      )}
      {kinds.map((kind) => (
        <nav
          key={kind}
          aria-label={de.directory.groups[kind] ?? kind}
          className="flex flex-col gap-2"
        >
          <span className="flex flex-wrap items-baseline gap-x-2">
            <SectionLabel>
              {de.directory.groups[kind] ?? de.professionKinds[kind] ?? kind}
            </SectionLabel>
            {kind === "gathering" && (
              <span className="text-xs text-muted">
                {de.directory.gatheringHint}{" "}
                <Link
                  href="/farmspots"
                  className="font-semibold text-accent-strong hover:text-white"
                >
                  {de.directory.toFarmspots}
                </Link>
              </span>
            )}
          </span>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {professions
              .filter((profession) => profession.kind === kind)
              .map((profession) => (
                <li key={profession.id}>
                  <ProfessionTile
                    profession={profession}
                    crafters={crafterOf(profession)}
                    actorId={actorId}
                    active={profession.id === selectedId}
                    href={hrefFor(profession)}
                  />
                </li>
              ))}
          </ul>
        </nav>
      ))}
    </section>
  );
}

function topSkill(crafters: Crafter[]): number | null {
  const skills = crafters
    .map((crafter) => crafter.skillLevel)
    .filter((skill): skill is number => skill !== null);
  return skills.length > 0 ? Math.max(...skills) : null;
}

function ProfessionTile({
  profession,
  crafters,
  actorId,
  active,
  href,
}: {
  profession: ProfessionSummary;
  crafters: Crafter[];
  actorId: string;
  active: boolean;
  href: string;
}) {
  const empty = crafters.length === 0;
  const mine = crafters.some((crafter) => crafter.userId === actorId);
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`flex h-full flex-col gap-1 rounded-2xl border px-3.5 py-3 ${
        active
          ? "border-[#6e58c8] bg-accent-soft"
          : empty
            ? "border-dashed border-[#2c2645] hover:border-[#3a3358]"
            : "border-border bg-surface hover:border-[#3a3358]"
      }`}
    >
      <span
        className={`flex items-center gap-2 text-[14.5px] font-bold ${empty ? "text-[#8f88aa]" : "text-white"}`}
      >
        {localize(profession.name)}
        {mine && (
          <span
            title={de.directory.youHaveIt}
            className="h-2 w-2 shrink-0 rounded-full bg-success"
          >
            <span className="sr-only">{de.directory.youHaveIt}</span>
          </span>
        )}
      </span>
      <span className={`text-xs ${empty ? "text-[#8f88aa]" : "text-muted"}`}>
        {de.directory.holders(crafters.length, topSkill(crafters))}
      </span>
    </Link>
  );
}

function ProfessionDetail({
  profession,
  crafters,
  actorId,
}: {
  profession: ProfessionSummary;
  crafters: Crafter[];
  actorId: string;
}) {
  const name = localize(profession.name);
  // Bars only where the recipes give a scale; gathering skill has none here.
  const cap =
    profession.kind === "gathering" || profession.topRecipeSkill === null
      ? null
      : Math.max(profession.topRecipeSkill, topSkill(crafters) ?? 0);
  const sorted = [...crafters].sort(
    (a, b) =>
      Number(b.userId === actorId) - Number(a.userId === actorId) ||
      (b.skillLevel ?? -1) - (a.skillLevel ?? -1),
  );
  return (
    <section
      aria-labelledby="profession-title"
      className="flex flex-col gap-1.5 rounded-[22px] border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pb-1.5">
        <h2
          id="profession-title"
          className="font-display text-[26px] font-semibold text-white"
        >
          {name}
        </h2>
        <span className="text-sm text-muted">
          {de.directory.holders(crafters.length, null)}
          {de.directory.packRecipes(profession.recipeCount)}
        </span>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-[#2c2645] px-3.5 py-3 text-[13px] text-muted">
          {de.directory.nobodyHasIt(name)}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {sorted.map((crafter) => (
            <CrafterRow
              key={crafter.characterId}
              crafter={crafter}
              mine={crafter.userId === actorId}
              cap={cap}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CrafterRow({
  crafter,
  mine,
  cap,
}: {
  crafter: Crafter;
  mine: boolean;
  cap: number | null;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <ClassAvatar
        initial={crafter.characterName.charAt(0)}
        color={crafter.classColor}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2 text-[15px]">
          <span className="font-bold text-white">{crafter.characterName}</span>
          <span className="text-[13px] text-muted">{crafter.memberName}</span>
          {mine && <YouBadge />}
          {crafter.specialization && (
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-bold text-soft">
              {crafter.specialization}
            </span>
          )}
        </span>
        {crafter.skillLevel === null ? (
          <span className="text-[13px] font-semibold text-warning">
            {de.directory.skillMissing}
            {mine && (
              <>
                {" · "}
                <Link
                  href={`/charaktere/${crafter.characterId}?bereich=berufe`}
                  className="text-accent-strong hover:text-white"
                >
                  {de.directory.toCharacter}
                </Link>
              </>
            )}
          </span>
        ) : cap === null ? (
          <span className="text-[13px] font-bold text-soft tabular-nums">
            {crafter.skillLevel}
          </span>
        ) : (
          <span className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span
              className="block h-1.5 overflow-hidden rounded-full bg-chip"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, (crafter.skillLevel / cap) * 100)}%`,
                }}
              />
            </span>
            <span className="text-[13px] font-bold text-soft tabular-nums">
              {crafter.skillLevel} / {cap}
            </span>
          </span>
        )}
        {crafter.notes && (
          <p className="text-[13px] text-soft">„{crafter.notes}“</p>
        )}
        {crafter.recipes.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs text-muted">
              {de.directory.rareRecipes}
            </span>
            {crafter.recipes.map((recipe) => (
              <span
                key={recipe.name}
                title={recipe.notes ?? undefined}
                className="rounded-full bg-success-soft px-2.5 py-1 text-[12.5px] font-semibold text-success"
              >
                {recipe.name}
              </span>
            ))}
          </span>
        )}
      </div>
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
