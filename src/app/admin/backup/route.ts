import { currentActor } from "@/lib/auth/current-actor";
import { permissions } from "@/lib/auth/guards";
import { createSanitizedBackup } from "@/lib/backup/sanitized-backup";
import { getDb } from "@/lib/db/client";
import { formatIsoDate } from "@/i18n/format";

export async function GET() {
  const actor = await currentActor();
  // 404 rather than 403, so the endpoint does not reveal itself to non-owners.
  if (!actor || !permissions.downloadBackup(actor).allowed) {
    return new Response(null, { status: 404 });
  }

  const content = await createSanitizedBackup(getDb(), actor);
  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="guildhub-${formatIsoDate(new Date())}.db"`,
      "Cache-Control": "no-store",
    },
  });
}
