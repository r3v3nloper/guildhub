import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolderImageStore } from "./image-store";

const FILE = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("FolderImageStore", () => {
  let folder: string;

  beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), "guildhub-gallery-"));
  });

  afterEach(() => {
    fs.rmSync(folder, { recursive: true, force: true });
  });

  it("keeps picture and preview apart and removes both", () => {
    // Arrange
    const store = new FolderImageStore(path.join(folder, "gallery"));
    store.write(FILE, "image", Buffer.from("bild"));
    store.write(FILE, "preview", Buffer.from("vorschau"));

    // Act
    const image = store.read(FILE, "image")?.toString();
    const preview = store.read(FILE, "preview")?.toString();
    store.remove([FILE]);

    // Assert
    expect(image).toBe("bild");
    expect(preview).toBe("vorschau");
    expect(store.read(FILE, "image")).toBeUndefined();
    expect(fs.readdirSync(path.join(folder, "gallery"))).toEqual([]);
  });

  it("refuses names it did not generate, so nothing outside the folder is reached", () => {
    // Arrange
    const store = new FolderImageStore(folder);

    // Act & Assert
    expect(() => store.read("../guildhub.db", "image")).toThrow();
    expect(() => store.remove(["../guildhub"])).toThrow();
  });
});
