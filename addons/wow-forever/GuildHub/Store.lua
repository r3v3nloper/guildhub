local _, ns = ...

-- GuildHubDB is account-wide, so one export carries every character of the account that
-- has been logged in since the addon was installed.
--
-- GuildHubDB.characters["Realm|Name"] = {
--   realm, name, faction, race, class, level, deaths,
--   professions = { [skillLineId] = { skill, readAt, recipes = { [spellId] = true } } },
-- }

local STORE_VERSION = 1

function ns.InitStore()
  if type(GuildHubDB) ~= "table" or GuildHubDB.version ~= STORE_VERSION then
    GuildHubDB = { version = STORE_VERSION, characters = {} }
  end
end

function ns.CurrentCharacter()
  local realm, name = GetRealmName(), UnitName("player")
  local key = realm .. "|" .. name
  local character = GuildHubDB.characters[key]
  if not character then
    character = { realm = realm, name = name, deaths = 0, professions = {} }
    GuildHubDB.characters[key] = character
  end
  return character
end

function ns.Profession(character, skillLineId)
  local profession = character.professions[skillLineId]
  if not profession then
    profession = { recipes = {} }
    character.professions[skillLineId] = profession
  end
  return profession
end

function ns.SortedCharacters()
  local list = {}
  for _, character in pairs(GuildHubDB.characters) do
    table.insert(list, character)
  end
  table.sort(list, function(a, b)
    if a.realm ~= b.realm then
      return a.realm < b.realm
    end
    return a.name < b.name
  end)
  return list
end
