import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { checkDatabase } from "@/lib/db/health";
import { failingPacks } from "@/lib/packs/status";

export async function GET() {
  await connection();

  const db = getDb();
  const database = checkDatabase(db);
  if (!database.ok) {
    return Response.json(
      { status: "error", db: database.error },
      { status: 503 },
    );
  }

  // A broken pack degrades the app but must not send Docker into a restart loop,
  // hence still HTTP 200 (SPEC 6.5).
  const failing = failingPacks(db);
  if (failing.length > 0) {
    return Response.json({
      status: "degraded",
      db: "ok",
      packs: Object.fromEntries(
        failing.map((entry) => [entry.gameId, `error: ${entry.error}`]),
      ),
    });
  }

  return Response.json({ status: "ok", db: "ok" });
}
