"use client";

import { useSyncExternalStore } from "react";
import { de } from "@/i18n/de";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-warning px-4 py-2 text-center text-sm font-semibold text-on-accent"
    >
      {de.pwa.offline}
    </div>
  );
}
