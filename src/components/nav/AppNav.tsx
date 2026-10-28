import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/components/auth/auth-actions";
import { UserMenu } from "@/components/auth/UserMenu";
import { canViewAdmin, currentActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { readGameFilter } from "@/lib/game-filter";
import { listCraftRequestsForCrafter } from "@/lib/guild/craft-requests";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { GameSwitcher } from "./GameSwitcher";
import { MoreMenu } from "./MoreMenu";
import { navGroups } from "./nav-links";
import { SidebarLink, TabLink } from "./NavLink";

/**
 * Navigation for signed-in members: a sidebar with every page on wide screens, a slim
 * header plus bottom tab bar on phones. Visitors get no navigation, the start page
 * carries the sign-in.
 */
export async function AppNav() {
  const actor = await currentActor();
  if (!actor) {
    return null;
  }

  const db = getDb();
  const games = listEnabledGames(db, actor.guildId);
  const selected = await readGameFilter(games.map((game) => game.id));
  const openRequests = listCraftRequestsForCrafter(
    db,
    actor,
    games.map((game) => game.id),
  ).length;
  const badges: Record<string, number> = { "/antraege": openRequests };
  const groups = navGroups(canViewAdmin(actor));
  const [main, ...more] = groups;
  const switcher = games.length > 0 && (
    <GameSwitcher
      games={games.map((game) => ({
        id: game.id,
        name: localize(game.name),
      }))}
      selected={selected}
    />
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-sidebar px-4 py-5 md:flex">
        <Brand />
        {switcher && (
          <div className="flex flex-col gap-1.5 px-2">
            <span className="text-[11px] font-bold tracking-widest text-muted uppercase">
              {de.nav.gameSwitcher}
            </span>
            {switcher}
          </div>
        )}
        <nav aria-label={de.nav.menu} className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className="px-3 pb-1.5 text-[11px] font-bold tracking-widest text-muted uppercase">
                {group.label}
              </span>
              {group.links.map((link) => (
                <SidebarLink
                  key={link.href}
                  {...link}
                  badge={badges[link.href]}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto">
          <UserMenu role={de.memberRoles[actor.role]} />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-sidebar/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Brand compact />
        <div className="ml-auto max-w-44 min-w-0">{switcher}</div>
      </header>

      <nav
        aria-label={de.nav.menu}
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-sidebar/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden"
      >
        {main.links.map((link) => (
          <TabLink
            key={link.href}
            {...link}
            label={link.shortLabel ?? link.label}
            badge={badges[link.href]}
          />
        ))}
        <MoreMenu
          id="nav-menu"
          label={de.nav.more}
          groups={more}
          badge={openRequests}
          signOut={signOutAction}
          signOutLabel={de.auth.signOut}
        />
      </nav>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5 px-2 text-white"
    >
      <Image
        src="/logo.png"
        alt=""
        width={compact ? 30 : 40}
        height={compact ? 35 : 47}
        priority
        unoptimized
      />
      <span
        className={`font-display font-semibold ${compact ? "text-xl" : "text-2xl"}`}
      >
        {de.app.name}
      </span>
    </Link>
  );
}
