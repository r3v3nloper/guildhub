import Link from "next/link";
import { de } from "@/i18n/de";

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">{de.errors.notFoundTitle}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {de.errors.notFoundText}
      </p>
      <Link href="/" className="text-accent underline">
        {de.auth.backToStart}
      </Link>
    </section>
  );
}
