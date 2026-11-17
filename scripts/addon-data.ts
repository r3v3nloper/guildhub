import fs from "node:fs";
import path from "node:path";
import { loadPacks } from "../src/lib/packs/loader";
import { professionDataLua } from "./addon/profession-data";

// Writes the pack data the game addon needs (SPEC 7.3) into its folder.
// Usage: npm run addon:data [-- <pack-id>]

function main() {
  const packId = process.argv[2] ?? "wow-forever";
  const pack = loadPacks(path.resolve("packs"), { includeHidden: false }).find(
    (loaded) => loaded.folderName === packId,
  )?.pack;
  if (!pack) {
    throw new Error(`Pack ${packId} fehlt oder ist ungültig.`);
  }
  const file = path.resolve("addons", packId, "GuildHub", "Data.lua");
  fs.writeFileSync(file, professionDataLua(pack));
  console.log(`Nach ${file} geschrieben.`);
}

main();
