import fs from "node:fs";
import path from "node:path";
import {
  validatePack,
  type PackIssue,
  type PackValidationResult,
} from "./validate";

export const PACK_FILE_NAME = "pack.json";

export function packsDirectory(): string {
  // Excluded from output tracing: the Dockerfile copies packs/ explicitly, and a dynamic path
  // here would otherwise pull the whole project into the standalone build.
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.PACKS_DIR ?? "packs",
  );
}

export interface LoadedPack extends PackValidationResult {
  folderName: string;
  /** Path relative to the working directory, for messages. */
  file: string;
  /** Raw file content; its hash tells the sync whether anything changed. */
  content: string | undefined;
}

/**
 * Folders starting with `_` (e.g. `_examples`) are only validated, never loaded into
 * the app (SPEC 6.1). They may nest one level: `_examples/beispiel-rpg/pack.json`.
 */
export function loadPacks(
  directory: string,
  options: { includeHidden: boolean },
): LoadedPack[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const loaded: LoadedPack[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const folder = path.join(directory, entry.name);
    if (!entry.name.startsWith("_")) {
      loaded.push(loadPackFolder(folder));
      continue;
    }
    if (!options.includeHidden) {
      continue;
    }
    for (const nested of fs.readdirSync(folder, { withFileTypes: true })) {
      if (nested.isDirectory()) {
        loaded.push(loadPackFolder(path.join(folder, nested.name)));
      }
    }
  }
  return loaded.sort((a, b) => a.file.localeCompare(b.file));
}

function loadPackFolder(folder: string): LoadedPack {
  const folderName = path.basename(folder);
  const filePath = path.join(folder, PACK_FILE_NAME);
  const file = path.relative(process.cwd(), filePath).replaceAll("\\", "/");
  const failed = (message: string): LoadedPack => ({
    folderName,
    file,
    content: undefined,
    pack: undefined,
    errors: [{ path: "", message }],
    warnings: [],
  });

  if (!fs.existsSync(filePath)) {
    return failed(`${PACK_FILE_NAME} fehlt`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    return failed(
      `kein gültiges JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { folderName, file, content, ...validatePack(raw, folderName) };
}

export function formatIssue(file: string, issue: PackIssue): string {
  return issue.path
    ? `${file}: ${issue.path}: ${issue.message}`
    : `${file}: ${issue.message}`;
}
