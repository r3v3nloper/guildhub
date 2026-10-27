import Link from "next/link";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { Card } from "@/components/ui/ui";
import { currentActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { listEnabledGames } from "@/lib/roster/game-catalog";
import { de } from "@/i18n/de";

async function HomeContent() {
  const actor = await currentActor();

  if (!actor) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-2">
        <h1 className="text-2xl font-semibold">{de.home.welcome}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{de.home.signInHint}</p>
      </section>
    );
  }

  const hasGames = listEnabledGames(getDb(), actor.guildId).length > 0;
  const cards = [
    { href: "/roster", title: de.nav.roster, text: de.home.rosterCard },
    {
      href: "/charaktere",
      title: de.nav.characters,
      text: de.home.charactersCard,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{de.home.welcome}</h1>
      {!hasGames && (
        <p className="text-amber-700 dark:text-amber-400">{de.home.noGames}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card title={card.title} className="h-full hover:border-accent">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {card.text}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PageSuspense>
      <HomeContent />
    </PageSuspense>
  );
}
