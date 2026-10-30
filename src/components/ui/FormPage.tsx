import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The frame of a create or edit page: back to where one came from, the title, the form
 * in a card, and optionally a separate zone for deleting.
 */
export function FormPage({
  backHref,
  backLabel,
  title,
  eyebrow,
  children,
  danger,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  /** Small line above the title, e.g. the class or game. */
  eyebrow?: ReactNode;
  children: ReactNode;
  danger?: { title: string; text: string; action: ReactNode };
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <header className="mb-2 flex flex-col gap-3">
        <Link
          href={backHref}
          className="-ml-2 flex min-h-10 w-fit items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-soft hover:bg-raised hover:text-white"
        >
          <i className="pi pi-arrow-left text-xs" aria-hidden />
          {backLabel}
        </Link>
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <span className="text-sm font-semibold text-muted">{eyebrow}</span>
          )}
          <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
            {title}
          </h1>
        </div>
      </header>
      <div className="rounded-[22px] border border-border bg-surface p-5 md:p-6">
        {children}
      </div>
      {danger && (
        <section
          aria-labelledby="danger-zone"
          className="flex flex-col gap-2 rounded-[22px] border border-[#4a2430] p-4.5"
        >
          <h2 id="danger-zone" className="text-sm font-bold text-danger">
            {danger.title}
          </h2>
          <p className="text-[13px] text-muted">{danger.text}</p>
          {danger.action}
        </section>
      )}
    </div>
  );
}
