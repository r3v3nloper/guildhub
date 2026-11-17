import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { craftRequests } from "@/lib/db/schema";
import {
  acceptCraftRequest,
  createCraftRequest,
} from "@/lib/guild/craft-requests";
import { saveCharacter } from "@/lib/roster/characters";
import { addonPack } from "../../../test/fixtures/addon";
import { characterInput } from "../../../test/fixtures/characters";
import { createGuildFixture } from "../../../test/fixtures/guild";
import type { ExportedRequestAction } from "./export-payload";
import { applyRequestActions, previewRequestActions } from "./request-actions";

describe("request actions from the addon", () => {
  let db: AppDatabase;
  let anna: Actor;
  let ben: Actor;
  let carl: Actor;

  beforeEach(() => {
    ({
      db,
      actors: [anna, ben, carl],
    } = createGuildFixture(addonPack, [
      { discordId: "100000000000000001", role: "owner" },
      { discordId: "100000000000000002" },
      { discordId: "100000000000000003" },
    ]));
    for (const [actor, name] of [
      [anna, "Thrall"],
      [carl, "Grom"],
    ] as const) {
      saveCharacter(
        db,
        actor,
        "wow-test",
        characterInput({
          name,
          raceKey: "orc",
          classKey: "shaman",
          professionKeys: ["alchemy"],
        }),
      );
    }
    createCraftRequest(db, ben, {
      gameId: "wow-test",
      professionKey: "alchemy",
      item: "alchemy-2330",
      quantity: 1,
      notes: "",
    });
  });

  const at = (minute: number) => new Date(Date.UTC(2026, 10, 17, 12, minute));
  const action = (
    requestAction: ExportedRequestAction["action"],
    minute: number,
    requestId = 1,
  ): ExportedRequestAction => ({
    requestId,
    action: requestAction,
    at: at(minute),
  });

  function status() {
    return db
      .select({
        status: craftRequests.status,
        crafterId: craftRequests.crafterId,
      })
      .from(craftRequests)
      .where(eq(craftRequests.id, 1))
      .get();
  }

  it("previews without changing anything, then applies in the order of events", () => {
    // Arrange: "done" was clicked after "accept", but arrives first
    const actions = [action("done", 5), action("accept", 1)];

    // Act
    const preview = previewRequestActions(db, anna, "wow-test", actions);
    const unchanged = status();
    const applied = applyRequestActions(db, anna, "wow-test", actions);

    // Assert
    expect(preview.map((outcome) => outcome.result)).toEqual([
      "applied",
      "applied",
    ]);
    expect(unchanged).toEqual({ status: "open", crafterId: null });
    expect(applied).toEqual([
      expect.objectContaining({
        action: "accept",
        item: "Schwacher Heiltrank",
      }),
      expect.objectContaining({ action: "done", result: "applied" }),
    ]);
    expect(status()).toEqual({ status: "done", crafterId: anna.userId });
  });

  it("drops an accept when someone else was faster, with the reason", () => {
    // Arrange
    acceptCraftRequest(db, carl, 1);

    // Act
    const [outcome] = applyRequestActions(db, anna, "wow-test", [
      action("accept", 1),
    ]);

    // Assert
    expect(outcome).toMatchObject({
      result: "discarded",
      reason: "Der Antrag hat sich inzwischen geändert.",
    });
    expect(status()).toEqual({ status: "accepted", crafterId: carl.userId });
  });

  it("drops actions on requests of others and on requests that are gone", () => {
    // Arrange
    acceptCraftRequest(db, carl, 1);

    // Act
    const outcomes = applyRequestActions(db, anna, "wow-test", [
      action("done", 1),
      action("accept", 2, 99),
    ]);

    // Assert
    expect(outcomes).toEqual([
      expect.objectContaining({
        result: "discarded",
        reason: "Nur wer den Antrag angenommen hat, kann das.",
      }),
      expect.objectContaining({
        requestId: 99,
        item: null,
        result: "discarded",
        reason: "Den Antrag gibt es nicht mehr.",
      }),
    ]);
  });

  it("never dates a request into the future", () => {
    // Act
    applyRequestActions(db, anna, "wow-test", [
      { requestId: 1, action: "accept", at: new Date("2999-01-01") },
    ]);

    // Assert
    const acceptedAt = db.select().from(craftRequests).get()!.acceptedAt!;
    expect(acceptedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
