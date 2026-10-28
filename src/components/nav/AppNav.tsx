import Link from "next/link";
import { signOutAction } from "@/components/auth/auth-actions";
import { UserMenu } from "@/components/auth/UserMenu";
import { canViewAdmin, currentActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { GameSwitcher } from "./GameSwitcher";
import { MoreMenu } from "./MoreMenu";

export async function AppNav() {
  const actor = await currentActor();
  if (!actor) {
    return <UserMenu />;
  }

  const games = listEnabledGames(getDb(), actor.guildId);
  const selected = await readGameFilter(games.map((game) => game.id));
  const links = [
    { href: "/", label: de.nav.today, icon: "pi-check-square" },
    { href: "/roster", label: de.nav.roster, icon: "pi-users" },
    { href: "/charaktere", label: de.nav.characters, icon: "pi-id-card" },
  ];
  const moreGroups = [
    {
      label: de.nav.guildGroup,
      links: [
        { href: "/matrix", label: de.nav.matrix, icon: "pi-table" },
        { href: "/berufe", label: de.nav.directory, icon: "pi-wrench" },
        { href: "/antraege", label: de.nav.requests, icon: "pi-inbox" },
        {
          href: "/stat-prio",
          label: de.nav.statPriorities,
          icon: "pi-sort-amount-down",
        },
      ],
    },
    {
      label: de.nav.plannerGroup,
      links: [
        { href: "/aufgaben", label: de.nav.tasks, icon: "pi-list-check" },
        { href: "/listen", label: de.nav.todos, icon: "pi-list" },
        { href: "/dungeons", label: de.nav.checklists, icon: "pi-flag" },
        { href: "/farmspots", label: de.nav.farmSpots, icon: "pi-map-marker" },
      ],
    },
    ...(canViewAdmin(actor)
      ? [
          {
            label: de.nav.adminGroup,
            links: [{ href: "/admin", label: de.nav.admin, icon: "pi-cog" }],
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 items-center justify-end gap-x-3 md:gap-x-4">
      <nav className="hidden gap-3 text-sm md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 hover:text-accent"
          >
            <i className={`pi ${link.icon}`} aria-hidden />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="hidden shrink-0 md:block">
        <MoreMenu id="more-menu" label={de.nav.more} groups={moreGroups} />
      </div>
      <div className="shrink-0 md:hidden">
        <MoreMenu
          id="nav-menu"
          label={de.nav.menu}
          groups={[{ label: de.nav.mainGroup, links }, ...moreGroups]}
          compact
          signOut={signOutAction}
          signOutLabel={de.auth.signOut}
        />
      </div>
      {games.length > 0 && (
        <GameSwitcher
          games={games.map((game) => ({
            id: game.id,
            name: localize(game.name),
          }))}
          selected={selected}
        />
      )}
      <UserMenu />
    </div>
  );
}
