import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { checkDatabase } from "@/lib/db/health";
import { failingPacks } from "@/lib/packs/status";

// Public endpoint: it names what is broken, never why. Details (paths, SQL) go to the log
// and to the admin area.
export async function GET() {
  await connection();

  const db = getDb();
  const database = checkDatabase(db);
  if (!database.ok) {
    console.error(`[health] Datenbank: ${database.error}`);
    return Response.json({ status: "error", db: "error" }, { status: 503 });
  }

  // A broken pack degrades the app but must not send Docker into a restart loop,
  // hence still HTTP 200 (SPEC 6.5).
  const failing = failingPacks(db);
  if (failing.length > 0) {
    return Response.json({
      status: "degraded",
      db: "ok",
      packs: Object.fromEntries(
        failing.map((entry) => [entry.gameId, "error"]),
      ),
    });
  }

  return Response.json({ status: "ok", db: "ok" });
}
