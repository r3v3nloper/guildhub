import { Suspense, type ReactNode } from "react";

/**
 * Every page reads the session and the DB at request time. With Cache Components that
 * access must sit inside a Suspense boundary below the root layout, so the static shell
 * and client navigations stay instant while the content streams in.
 */
export function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Lädt …</p>}>
      {children}
    </Suspense>
  );
}
