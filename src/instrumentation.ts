export async function register() {
  // Startup needs node:fs and better-sqlite3, which the edge runtime lacks.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getDb } = await import("@/lib/db/client");
  const { serverEnv } = await import("@/lib/env");
  const { packsDirectory } = await import("@/lib/packs/loader");
  const { runStartup } = await import("@/lib/startup");
  runStartup(getDb(), serverEnv(), packsDirectory());
}
