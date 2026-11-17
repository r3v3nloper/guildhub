import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddonImport } from "@/components/addon/AddonImport";
import { FormPage } from "@/components/ui/FormPage";
import { PageSuspense } from "@/components/ui/PageSuspense";
import { requireActor } from "@/lib/auth/current-actor";
import { getDb } from "@/lib/db/client";
import { isGameEnabled, loadGameCatalog } from "@/lib/roster/game-catalog";
import { textParam } from "@/lib/search-params";
import { localize } from "@/i18n/localize";
import { de } from "@/i18n/de";
import { applyAddonImportAction, previewAddonImportAction } from "./actions";

export const metadata: Metadata = { title: de.addonImport.title };

async function AddonImportContent({
  searchParams,
}: PageProps<"/charaktere/abgleich">) {
  const actor = await requireActor();
  const gameId = textParam((await searchParams).spiel) ?? "";
  const db = getDb();
  const catalog = loadGameCatalog(db, gameId);
  if (
    !catalog ||
    !catalog.game.meta.capabilities.addon_import ||
    !isGameEnabled(db, actor.guildId, gameId)
  ) {
    notFound();
  }

  return (
    <FormPage
      backHref="/charaktere"
      backLabel={de.addonImport.back}
      title={de.addonImport.title}
      eyebrow={localize(catalog.game.name)}
    >
      <AddonImport
        preview={previewAddonImportAction.bind(null, gameId)}
        apply={applyAddonImportAction.bind(null, gameId)}
      />
    </FormPage>
  );
}

export default function AddonImportPage(
  props: PageProps<"/charaktere/abgleich">,
) {
  return (
    <PageSuspense>
      <AddonImportContent {...props} />
    </PageSuspense>
  );
}
