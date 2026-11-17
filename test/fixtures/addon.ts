/** A small WoW-like pack with game_ref values and recipes, for the addon exchange tests. */
export const addonPack = {
  id: "wow-test",
  name: "WoW Test",
  version: "1.0.0",
  capabilities: {
    classes: true,
    races: true,
    factions: true,
    professions: true,
    servers: true,
    death_count: true,
    addon_import: true,
  },
  factions: [{ id: "horde", name: "Horde", game_ref: "Horde" }],
  races: [
    {
      id: "orc",
      name: "Orc",
      game_ref: "Orc",
      faction: "horde",
      allowed_classes: ["shaman", "warrior"],
    },
  ],
  classes: [
    { id: "shaman", name: "Schamane", role: "heal", game_ref: "SHAMAN" },
    { id: "warrior", name: "Krieger", role: "tank", game_ref: "WARRIOR" },
  ],
  professions: [
    { id: "alchemy", name: "Alchemie", game_ref: "171" },
    {
      id: "herbalism",
      name: "Kräuterkunde",
      kind: "gathering",
      game_ref: "182",
    },
  ],
  recipes: [
    { id: "alchemy-2330", name: "Schwacher Heiltrank", profession: "alchemy" },
    { id: "alchemy-2335", name: "Beweglichkeitstrank", profession: "alchemy" },
  ],
};
