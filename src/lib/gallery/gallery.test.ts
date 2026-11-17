import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { listAudit } from "@/lib/audit/audit";
import { disableMember, purgeMember } from "@/lib/auth/membership";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteChecklist, saveChecklist } from "@/lib/lists/checklists";
import {
  createListFixture,
  type ListFixture,
} from "../../../test/fixtures/lists";
import {
  addGalleryImage,
  deleteGalleryImage,
  deleteWithGalleryFiles,
  listGalleryImages,
  readGalleryImage,
  updateGalleryImage,
  type GalleryUpload,
  type GalleryUploadInput,
} from "./gallery";
import { GALLERY_MAX_BYTES } from "./gallery-limits";
import type { ImageStore, ImageVariant } from "./image-store";

/** Keeps files in memory, so the rules can be checked without a disk. */
class MemoryImageStore implements ImageStore {
  public readonly files = new Map<string, Buffer>();

  public write(file: string, variant: ImageVariant, content: Buffer): void {
    this.files.set(`${file}:${variant}`, content);
  }

  public read(file: string, variant: ImageVariant): Buffer | undefined {
    return this.files.get(`${file}:${variant}`);
  }

  public remove(files: readonly string[]): void {
    for (const file of files) {
      this.files.delete(`${file}:image`);
      this.files.delete(`${file}:preview`);
    }
  }
}

let screenshot: Buffer;

function upload(content: Uint8Array, size = content.byteLength): GalleryUpload {
  return {
    size,
    arrayBuffer: async () => new Uint8Array(content).buffer,
  };
}

describe("gallery", () => {
  let fixture: ListFixture;
  let store: MemoryImageStore;

  beforeEach(async () => {
    fixture = createListFixture();
    store = new MemoryImageStore();
    screenshot ??= await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
  });

  function dungeonPage(
    owner = fixture.member,
    visibility: "guild" | "private" = "guild",
  ): number {
    const result = saveChecklist(fixture.db, owner, {
      name: "Todesminen",
      gameId: "game",
      visibility,
      items: "Heiltränke",
      notes: "",
      instanceKey: "",
    });
    if (!result.ok) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result.checklistId;
  }

  async function added(
    actor = fixture.member,
    overrides: Partial<GalleryUploadInput> = {},
  ): Promise<number> {
    const result = await addGalleryImage(fixture.db, store, actor, {
      upload: upload(screenshot),
      caption: "Erster Kill",
      takenOn: "2026-11-04",
      checklistId: undefined,
      ...overrides,
    });
    if (!result.ok) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result.id;
  }

  it("shows an upload in the general gallery with uploader, caption and date", async () => {
    // Arrange
    const { db, member, other } = fixture;

    // Act
    const id = await added(member, { caption: "  Erster   Kill " });

    // Assert
    expect(listGalleryImages(db, other, { includeDungeons: true })).toEqual([
      expect.objectContaining({
        id,
        caption: "Erster Kill",
        takenOn: "2026-11-04",
        width: 400,
        height: 300,
        uploaderName: "User 1111",
        checklist: null,
        canEdit: false,
        canDelete: false,
      }),
    ]);
    expect(readGalleryImage(db, store, other, id, "preview")).toBeDefined();
  });

  it("lists the latest day first", async () => {
    // Arrange
    const older = await added(fixture.member, { takenOn: "2026-10-01" });
    const newer = await added(fixture.member, { takenOn: "2026-11-05" });

    // Act
    const ids = listGalleryImages(fixture.db, fixture.member, {
      includeDungeons: true,
    }).map((image) => image.id);

    // Assert
    expect(ids).toEqual([newer, older]);
  });

  it("shows pictures of a guild dungeon page there and, unless hidden, in the general gallery", async () => {
    // Arrange
    const { db, other } = fixture;
    const page = dungeonPage();
    const general = await added();
    const dungeon = await added(fixture.member, { checklistId: page });

    // Act
    const onPage = listGalleryImages(db, other, { checklistId: page });
    const all = listGalleryImages(db, other, { includeDungeons: true });
    const withoutDungeons = listGalleryImages(db, other, {
      includeDungeons: false,
    });

    // Assert
    expect(onPage.map((image) => image.id)).toEqual([dungeon]);
    expect(all.find((image) => image.id === dungeon)?.checklist).toEqual({
      id: page,
      name: "Todesminen",
    });
    expect(withoutDungeons.map((image) => image.id)).toEqual([general]);
  });

  it("keeps pictures of a private dungeon page from everyone but its author", async () => {
    // Arrange
    const { db, member, other, officer } = fixture;
    const page = dungeonPage(member, "private");
    const id = await added(member, { checklistId: page });

    // Act & Assert
    expect(
      listGalleryImages(db, other, { includeDungeons: true }),
    ).toHaveLength(0);
    expect(() => listGalleryImages(db, other, { checklistId: page })).toThrow(
      NotFoundError,
    );
    expect(() => readGalleryImage(db, store, officer, id, "image")).toThrow(
      NotFoundError,
    );
    await expect(added(other, { checklistId: page })).rejects.toThrow(
      NotFoundError,
    );
    expect(
      listGalleryImages(db, member, { includeDungeons: true }),
    ).toHaveLength(1);
  });

  it("rejects missing, oversized and non-image files without storing anything", async () => {
    // Arrange
    const { db, member } = fixture;
    const base = { caption: "", takenOn: "2026-11-04", checklistId: undefined };

    // Act
    const missing = await addGalleryImage(db, store, member, {
      ...base,
      upload: undefined,
    });
    const oversized = await addGalleryImage(db, store, member, {
      ...base,
      upload: upload(screenshot, GALLERY_MAX_BYTES + 1),
    });
    const text = await addGalleryImage(db, store, member, {
      ...base,
      upload: upload(new TextEncoder().encode("kein Bild")),
    });

    // Assert
    expect(missing).toMatchObject({
      ok: false,
      errors: { upload: expect.any(String) },
    });
    expect(oversized).toMatchObject({
      ok: false,
      errors: { upload: expect.stringContaining("10 MB") },
    });
    expect(text).toMatchObject({
      ok: false,
      errors: { upload: expect.stringContaining("JPEG") },
    });
    expect(store.files.size).toBe(0);
  });

  it("rejects an invalid date and an overlong caption", async () => {
    // Act
    const result = await addGalleryImage(fixture.db, store, fixture.member, {
      upload: upload(screenshot),
      caption: "x".repeat(201),
      takenOn: "2026-02-30",
      checklistId: undefined,
    });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      errors: { caption: expect.any(String), takenOn: expect.any(String) },
    });
  });

  it("lets only the uploader change caption and date", async () => {
    // Arrange
    const { db, member, officer } = fixture;
    const id = await added(member);

    // Act
    const own = updateGalleryImage(db, member, id, {
      caption: "",
      takenOn: "2026-10-31",
    });

    // Assert
    expect(own).toEqual({ ok: true, id });
    expect(
      listGalleryImages(db, member, { includeDungeons: true })[0],
    ).toMatchObject({
      caption: null,
      takenOn: "2026-10-31",
    });
    expect(() =>
      updateGalleryImage(db, officer, id, {
        caption: "x",
        takenOn: "2026-10-31",
      }),
    ).toThrow(ForbiddenError);
  });

  it("lets a member delete only their own pictures and an officer any, with audit entry", async () => {
    // Arrange
    const { db, member, other, officer } = fixture;
    const own = await added(member);
    const foreign = await added(other);

    // Act
    deleteGalleryImage(db, store, member, own);
    const refused = () => deleteGalleryImage(db, store, member, foreign);

    // Assert
    expect(refused).toThrow(ForbiddenError);
    deleteGalleryImage(db, store, officer, foreign);
    expect(listGalleryImages(db, officer, { includeDungeons: true })).toEqual(
      [],
    );
    expect(store.files.size).toBe(0);
    expect(
      listAudit(db).filter((entry) => entry.action === "galleryImage.delete"),
    ).toEqual([
      expect.objectContaining({
        actorUserId: officer.userId,
        target: "Erster Kill",
      }),
    ]);
  });

  it("removes the files of a deleted dungeon page", async () => {
    // Arrange
    const { db, member } = fixture;
    const page = dungeonPage();
    await added(member, { checklistId: page });
    const general = await added(member);

    // Act
    deleteWithGalleryFiles(db, store, { checklistId: page }, () =>
      deleteChecklist(db, member, page),
    );

    // Assert
    expect(
      listGalleryImages(db, member, { includeDungeons: true }).map(
        (image) => image.id,
      ),
    ).toEqual([general]);
    expect(store.files.size).toBe(2);
  });

  it("keeps the files when the deletion is refused", async () => {
    // Arrange
    const { db, member, other } = fixture;
    const page = dungeonPage(member);
    await added(member, { checklistId: page });

    // Act
    const attempt = () =>
      deleteWithGalleryFiles(db, store, { checklistId: page }, () =>
        deleteChecklist(db, other, page),
      );

    // Assert
    expect(attempt).toThrow(ForbiddenError);
    expect(store.files.size).toBe(2);
  });

  it("removes a purged member's pictures with their files", async () => {
    // Arrange
    const { db, member, other, officer } = fixture;
    await added(other);
    const kept = await added(member);
    disableMember(db, officer, other.userId, {
      allowedDiscordIds: [],
      ownerDiscordId: undefined,
    });
    const owner = { ...officer, role: "owner" as const };

    // Act
    deleteWithGalleryFiles(db, store, { uploadedBy: other.userId }, () =>
      purgeMember(db, owner, other.userId),
    );

    // Assert
    expect(
      listGalleryImages(db, member, { includeDungeons: true }).map(
        (image) => image.id,
      ),
    ).toEqual([kept]);
    expect(store.files.size).toBe(2);
  });
});
