import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { recordAudit, type AuditAction } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { guildNotes, users } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { isGameEnabled } from "@/lib/roster/game-catalog";
import { GUILD_NOTE_BODY_MAX, GUILD_NOTE_TITLE_MAX } from "./guild-note-limits";

export type GuildNoteRow = typeof guildNotes.$inferSelect;

export interface GuildNoteView extends GuildNoteRow {
  updatedByName: string | null;
}

export interface GuildNoteInput {
  title: string;
  body: string;
  /** Empty for a note that applies to every game. */
  gameId: string;
  pinned: boolean;
}

export type GuildNoteErrors = Partial<Record<keyof GuildNoteInput, string>>;

export type GuildNoteResult =
  { ok: true; id: number } | { ok: false; errors: GuildNoteErrors };

/**
 * Guild notes for the shown games (SPEC 7.5): notes without a game always, game notes
 * only while their game is among `gameIds`. Pinned first, then the most recently changed.
 */
export function listGuildNotes(
  db: AppDatabase,
  gameIds: readonly string[],
  { pinnedOnly = false }: { pinnedOnly?: boolean } = {},
): GuildNoteView[] {
  const ofShownGames =
    gameIds.length === 0
      ? isNull(guildNotes.gameId)
      : or(isNull(guildNotes.gameId), inArray(guildNotes.gameId, [...gameIds]));
  return db
    .select({ note: guildNotes, updatedByName: users.name })
    .from(guildNotes)
    .leftJoin(users, eq(users.id, guildNotes.updatedBy))
    .where(
      pinnedOnly
        ? and(ofShownGames, eq(guildNotes.pinned, true))
        : ofShownGames,
    )
    .orderBy(
      desc(guildNotes.pinned),
      desc(guildNotes.updatedAt),
      desc(guildNotes.id),
    )
    .all()
    .map(({ note, updatedByName }) => ({ ...note, updatedByName }));
}

/** A note to edit; only officers get it. */
export function getGuildNote(
  db: AppDatabase,
  actor: Actor,
  noteId: number,
): GuildNoteRow {
  assertAllowed(permissions.manageGuildNotes(actor));
  const note = db
    .select()
    .from(guildNotes)
    .where(eq(guildNotes.id, noteId))
    .get();
  if (!note) {
    throw new NotFoundError("Notiz");
  }
  return note;
}

export function createGuildNote(
  db: AppDatabase,
  actor: Actor,
  input: GuildNoteInput,
): GuildNoteResult {
  assertAllowed(permissions.manageGuildNotes(actor));
  const parsed = parseGuildNote(db, actor, input);
  if (!parsed.ok) {
    return parsed;
  }
  const id = db
    .insert(guildNotes)
    .values({ ...parsed.values, updatedBy: actor.userId })
    .returning()
    .get().id;
  auditNote(db, actor, "guildNote.create", parsed.values.title, id);
  return { ok: true, id };
}

export function updateGuildNote(
  db: AppDatabase,
  actor: Actor,
  noteId: number,
  input: GuildNoteInput,
): GuildNoteResult {
  const existing = getGuildNote(db, actor, noteId);
  const parsed = parseGuildNote(db, actor, input);
  if (!parsed.ok) {
    return parsed;
  }
  db.update(guildNotes)
    .set({ ...parsed.values, updatedBy: actor.userId })
    .where(eq(guildNotes.id, existing.id))
    .run();
  auditNote(db, actor, "guildNote.update", parsed.values.title, existing.id);
  return { ok: true, id: existing.id };
}

/** Pinning changes only the flag; who last edited the text and when stays as it was. */
export function setGuildNotePinned(
  db: AppDatabase,
  actor: Actor,
  noteId: number,
  pinned: boolean,
): void {
  const note = getGuildNote(db, actor, noteId);
  if (note.pinned === pinned) {
    return;
  }
  db.update(guildNotes)
    .set({ pinned, updatedAt: note.updatedAt })
    .where(eq(guildNotes.id, note.id))
    .run();
  auditNote(
    db,
    actor,
    pinned ? "guildNote.pin" : "guildNote.unpin",
    note.title,
    note.id,
  );
}

export function deleteGuildNote(
  db: AppDatabase,
  actor: Actor,
  noteId: number,
): void {
  const note = getGuildNote(db, actor, noteId);
  db.delete(guildNotes).where(eq(guildNotes.id, note.id)).run();
  auditNote(db, actor, "guildNote.delete", note.title, note.id);
}

function parseGuildNote(
  db: AppDatabase,
  actor: Actor,
  input: GuildNoteInput,
):
  | {
      ok: true;
      values: Pick<GuildNoteRow, "title" | "body" | "gameId" | "pinned">;
    }
  | { ok: false; errors: GuildNoteErrors } {
  const errors: GuildNoteErrors = {};
  const title = input.title.trim();
  if (!title) {
    errors.title = "Bitte einen Titel eingeben, z. B. „Gildenregeln“.";
  } else if (title.length > GUILD_NOTE_TITLE_MAX) {
    errors.title = `Höchstens ${GUILD_NOTE_TITLE_MAX} Zeichen.`;
  }
  // Trailing blanks per line are noise; blank lines between paragraphs are content.
  const body = input.body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  if (!body) {
    errors.body = "Bitte einen Text eingeben.";
  } else if (body.length > GUILD_NOTE_BODY_MAX) {
    errors.body = `Höchstens ${GUILD_NOTE_BODY_MAX} Zeichen.`;
  }
  const gameId = input.gameId.trim();
  if (gameId && !isGameEnabled(db, actor.guildId, gameId)) {
    errors.gameId = "Dieses Spiel ist nicht aktiviert.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    values: { title, body, gameId: gameId || null, pinned: input.pinned },
  };
}

function auditNote(
  db: AppDatabase,
  actor: Actor,
  action: Extract<AuditAction, `guildNote.${string}`>,
  title: string,
  noteId: number,
): void {
  recordAudit(db, actor.userId, action, title, { noteId });
}
