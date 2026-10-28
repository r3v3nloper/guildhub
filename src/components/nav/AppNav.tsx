import Link from "next/link";
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
  const moreLinks = [
    { href: "/aufgaben", label: de.nav.tasks, icon: "pi-list-check" },
    { href: "/listen", label: de.nav.todos, icon: "pi-list" },
    { href: "/dungeons", label: de.nav.checklists, icon: "pi-flag" },
    { href: "/farmspots", label: de.nav.farmSpots, icon: "pi-map-marker" },
    ...(canViewAdmin(actor)
      ? [{ href: "/admin", label: de.nav.admin, icon: "pi-cog" }]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <nav className="flex gap-3 text-sm">
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
      <MoreMenu label={de.nav.more} links={moreLinks} />
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
