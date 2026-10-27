import { de } from "@/i18n/de";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <h1 className="text-2xl font-semibold">{de.home.welcome}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {de.home.underConstruction}
      </p>
    </section>
  );
}
