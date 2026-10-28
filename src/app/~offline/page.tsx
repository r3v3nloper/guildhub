import type { Metadata } from "next";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.pwa.offlinePageTitle };

export default function OfflinePage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <h1 className="text-2xl font-semibold">{de.pwa.offlinePageTitle}</h1>
      <p className="text-muted">{de.pwa.offlinePageText}</p>
    </section>
  );
}
