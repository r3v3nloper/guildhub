import fs from "node:fs";
import path from "node:path";
import { serverEnv } from "@/lib/env";

/** The stored picture or its small preview for the grid. */
export type ImageVariant = "image" | "preview";

/**
 * Where gallery files live. Behind an interface so the gallery rules can be tested without
 * touching the disk; in the app it is the gallery folder in the data volume (SPEC 7.6).
 */
export interface ImageStore {
  write(file: string, variant: ImageVariant, content: Buffer): void;
  /** Undefined when the file is missing, e.g. after a partial restore. */
  read(file: string, variant: ImageVariant): Buffer | undefined;
  /** Removes both variants; missing files are fine. */
  remove(files: readonly string[]): void;
}

/** Only names the gallery generates itself, so a stored name can never leave the folder. */
const FILE_NAME = /^[0-9a-f-]{36}$/;

export class FolderImageStore implements ImageStore {
  public constructor(private readonly folder: string) {}

  public write(file: string, variant: ImageVariant, content: Buffer): void {
    fs.mkdirSync(this.folder, { recursive: true });
    fs.writeFileSync(this.pathOf(file, variant), content);
  }

  public read(file: string, variant: ImageVariant): Buffer | undefined {
    const filePath = this.pathOf(file, variant);
    try {
      return fs.readFileSync(filePath);
    } catch {
      return undefined;
    }
  }

  public remove(files: readonly string[]): void {
    for (const file of files) {
      fs.rmSync(this.pathOf(file, "image"), { force: true });
      fs.rmSync(this.pathOf(file, "preview"), { force: true });
    }
  }

  private pathOf(file: string, variant: ImageVariant): string {
    if (!FILE_NAME.test(file)) {
      throw new Error(`Ungültiger Bildname: ${file}`);
    }
    const suffix = variant === "image" ? ".webp" : ".preview.webp";
    return path.join(/*turbopackIgnore: true*/ this.folder, file + suffix);
  }
}

const globalForStore = globalThis as unknown as {
  guildhubImageStore?: ImageStore;
};

export function getImageStore(): ImageStore {
  globalForStore.guildhubImageStore ??= new FolderImageStore(
    serverEnv().galleryPath,
  );
  return globalForStore.guildhubImageStore;
}
