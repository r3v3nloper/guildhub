"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/ui";
import { de } from "@/i18n/de";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">{de.errors.title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{de.errors.text}</p>
      <div>
        <Button type="button" onClick={() => retry()}>
          {de.errors.retry}
        </Button>
      </div>
    </section>
  );
}
