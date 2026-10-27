export async function register() {
  // Migrations need node:fs and better-sqlite3, which the edge runtime lacks.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getDb } = await import("@/lib/db/client");
  const { migrateDatabase } = await import("@/lib/db/migrate");
  migrateDatabase(getDb());
}
