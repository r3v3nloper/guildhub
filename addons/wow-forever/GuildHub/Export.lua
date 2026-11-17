local _, ns = ...

-- The character export, in the format GuildHub reads (src/lib/addon/export-payload.ts):
-- GH1:<game>:export:<checksum>:<records>, records separated by ";", fields by ",".
--   C,<realm>,<name>,<faction>,<race>,<class>,<level>,<deaths>
--   P,<skill line id>,<skill>[,<spell id>…]
--   A,<request id>,<accept|done|return>,<unix seconds>   a request action from the game

local FORMAT_VERSION = 1

-- Names never contain the separators in the game; this only guards against surprises.
local function Clean(value)
  if value == nil then
    return ""
  end
  return (tostring(value):gsub("[,;:]", ""))
end

local function SortedKeys(map)
  local keys = {}
  for key in pairs(map) do
    table.insert(keys, key)
  end
  table.sort(keys)
  return keys
end

local function CharacterRecords(character, records)
  table.insert(records, table.concat({
    "C",
    Clean(character.realm),
    Clean(character.name),
    Clean(character.faction),
    Clean(character.race),
    Clean(character.class),
    Clean(character.level),
    Clean(character.deaths),
  }, ","))
  for _, skillLineId in ipairs(SortedKeys(character.professions)) do
    local profession = character.professions[skillLineId]
    local fields = { "P", skillLineId, Clean(profession.skill) }
    for _, spellId in ipairs(SortedKeys(profession.recipes)) do
      table.insert(fields, spellId)
    end
    table.insert(records, table.concat(fields, ","))
  end
end

function ns.BuildExport()
  local records = {}
  for _, character in ipairs(ns.SortedCharacters()) do
    CharacterRecords(character, records)
  end
  for _, action in ipairs(ns.PendingActions()) do
    table.insert(records, table.concat({ "A", action.id, action.action, action.at }, ","))
  end
  local payload = table.concat(records, ";")
  local checksum = ns.Adler32(ns.gameId .. ":export:" .. payload)
  return "GH" .. FORMAT_VERSION .. ":" .. ns.gameId .. ":export:" .. checksum .. ":" .. payload
end
