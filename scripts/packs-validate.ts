import {
  formatIssue,
  loadPacks,
  packsDirectory,
} from "../src/lib/packs/loader";

const packs = loadPacks(packsDirectory(), { includeHidden: true });

let errorCount = 0;
for (const loaded of packs) {
  for (const warning of loaded.warnings) {
    console.warn(`Warnung: ${formatIssue(loaded.file, warning)}`);
  }
  for (const error of loaded.errors) {
    console.error(`Fehler: ${formatIssue(loaded.file, error)}`);
  }
  errorCount += loaded.errors.length;
  if (loaded.errors.length === 0) {
    console.log(`OK: ${loaded.file} (${loaded.pack?.version})`);
  }
}

if (packs.length === 0) {
  console.error(`Keine Packs gefunden in ${packsDirectory()}`);
  process.exit(1);
}
if (errorCount > 0) {
  console.error(`${errorCount} Fehler in ${packs.length} Pack(s).`);
  process.exit(1);
}
