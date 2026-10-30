import { beforeEach, describe, expect, it } from "vitest";
import { listAudit } from "@/lib/audit/audit";
import { ForbiddenError } from "@/lib/errors";
import { gameCatalogEntries } from "@/lib/db/schema";
import { syncPack } from "@/lib/packs/sync";
import { validatePack } from "@/lib/packs/validate";
import {
  createTaskFixture,
  type TaskFixture,
} from "../../../test/fixtures/tasks";
import {
  createSpecBuild,
  deleteSpecBuild,
  listSpecBuilds,
  specBuildsOf,
  type SpecBuildInput,
} from "./spec-builds";

const classPack = {
  id: "game",
  name: "Spiel",
  version: "2.0.0",
  capabilities: { classes: true },
  classes: [{ id: "warrior", name: "Krieger" }],
  specs: [
    { id: "warrior-arms", name: "Waffen", class: "warrior", role: "melee" },
    {
      id: "warrior-protection",
      name: "Schutz",
      class: "warrior",
      role: "tank",
    },
  ],
};

const input: SpecBuildInput = {
  specKey: "warrior-arms",
  title: "Leveln",
  url: "https://example.org/talents/arms",
  notes: " Ab Stufe 10 ",
};

describe("spec builds", () => {
  let fixture: TaskFixture;

  beforeEach(() => {
    fixture = createTaskFixture();
    syncPack(fixture.db, {
      folderName: "game",
      file: "packs/game/pack.json",
      content: JSON.stringify(classPack),
      ...validatePack(classPack, "game"),
    });
  });

  const specId = (key: string) =>
    fixture.db
      .select()
      .from(gameCatalogEntries)
      .all()
      .find((entry) => entry.key === key)!.id;

  it("lets officers recommend a build per spec", () => {
    // Act
    const result = createSpecBuild(fixture.db, fixture.officer, "game", input);

    // Assert
    expect(result).toEqual({ ok: true });
    expect(listSpecBuilds(fixture.db, ["game"])).toEqual([
      expect.objectContaining({
        title: "Leveln",
        url: "https://example.org/talents/arms",
        notes: "Ab Stufe 10",
        specName: "Waffen",
        classKey: "warrior",
      }),
    ]);
    expect(listAudit(fixture.db)).toEqual([
      expect.objectContaining({ action: "specBuild.create", target: "Leveln" }),
    ]);
  });

  it("finds the builds of a character's specs only", () => {
    // Arrange
    createSpecBuild(fixture.db, fixture.officer, "game", input);
    createSpecBuild(fixture.db, fixture.officer, "game", {
      ...input,
      specKey: "warrior-protection",
      title: "Dungeon-Tank",
    });

    // Act
    const builds = specBuildsOf(fixture.db, [
      specId("warrior-protection"),
      null,
    ]);

    // Assert
    expect(builds.map((build) => build.title)).toEqual(["Dungeon-Tank"]);
  });

  it("validates spec, title and link", () => {
    // Act
    const result = createSpecBuild(fixture.db, fixture.officer, "game", {
      specKey: "mage-fire",
      title: "",
      url: "javascript:alert(1)",
      notes: "",
    });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: {
        specKey: expect.any(String),
        title: expect.any(String),
        url: expect.any(String),
      },
    });
  });

  it("keeps members from adding or deleting", () => {
    // Arrange
    createSpecBuild(fixture.db, fixture.officer, "game", input);
    const [build] = listSpecBuilds(fixture.db, ["game"]);

    // Act & Assert
    expect(() =>
      createSpecBuild(fixture.db, fixture.actor, "game", input),
    ).toThrow(ForbiddenError);
    expect(() => deleteSpecBuild(fixture.db, fixture.actor, build.id)).toThrow(
      ForbiddenError,
    );
    deleteSpecBuild(fixture.db, fixture.officer, build.id);
    expect(listSpecBuilds(fixture.db, ["game"])).toEqual([]);
  });
});
