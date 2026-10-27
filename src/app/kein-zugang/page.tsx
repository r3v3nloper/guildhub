import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { de } from "@/i18n/de";

export const metadata: Metadata = { title: de.auth.noAccessTitle };

// Auth.js redirects every sign-in error here; only AccessDenied means "not on the allowlist".
async function AuthErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const accessDenied = error === undefined || error === "AccessDenied";

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {accessDenied ? de.auth.noAccessTitle : de.auth.errorTitle}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {accessDenied ? de.auth.noAccessText : de.auth.errorText}
      </p>
    </>
  );
}

export default function NoAccessPage({
  searchParams,
}: PageProps<"/kein-zugang">) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <Suspense fallback={null}>
        <AuthErrorMessage searchParams={searchParams} />
      </Suspense>
      <Link href="/" className="text-accent underline">
        {de.auth.backToStart}
      </Link>
    </section>
  );
}
