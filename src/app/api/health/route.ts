import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { checkDatabase } from "@/lib/db/health";

export async function GET() {
  await connection();

  const database = checkDatabase(getDb());
  if (!database.ok) {
    return Response.json(
      { status: "error", db: database.error },
      { status: 503 },
    );
  }

  return Response.json({ status: "ok", db: "ok" });
}
