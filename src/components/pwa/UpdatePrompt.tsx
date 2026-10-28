"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect, useState } from "react";
import { de } from "@/i18n/de";

/** Asks before activating a new service worker instead of swapping it silently (SPEC 7.1). */
export function UpdatePrompt() {
  const { serwist } = useSerwist();
  const [updateWaiting, setUpdateWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) {
      return;
    }
    const showPrompt = () => setUpdateWaiting(true);
    serwist.addEventListener("waiting", showPrompt);
    return () => serwist.removeEventListener("waiting", showPrompt);
  }, [serwist]);

  if (!serwist || !updateWaiting) {
    return null;
  }

  const activateUpdate = () => {
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  };

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
    >
      <span>{de.pwa.updateAvailable}</span>
      <button
        type="button"
        onClick={activateUpdate}
        className="rounded border border-on-accent/60 px-2 py-0.5 font-medium"
      >
        {de.pwa.reload}
      </button>
    </div>
  );
}
