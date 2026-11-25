local _, ns = ...

-- GuildHubDB is account-wide, so one export carries every character of the account that
-- has been logged in since the addon was installed.
--
-- GuildHubDB.characters["Realm|Name"] = {
--   realm, name, faction, race, class, level, deaths,
--   professions = { [skillLineId] = { skill, readAt, recipes = { [spellId] = true } } },
-- }

--
-- GuildHubDB.accountId   random ID of this WoW account, so GuildHub can keep the blocks of
--                        different accounts apart (SPEC 7.3.3)
-- GuildHubDB.ownBlock    { at, content }: this account's export records and when they last
--                        changed
-- GuildHubDB.relay[id]   { at, content }: blocks other accounts' addons passed on in the game

local STORE_VERSION = 1
local ACCOUNT_ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz"
local ACCOUNT_ID_LENGTH = 12
local RELAY_KEPT_DAYS = 60

local function NewAccountId()
  local id = {}
  for i = 1, ACCOUNT_ID_LENGTH do
    local index = math.random(1, #ACCOUNT_ID_CHARS)
    id[i] = ACCOUNT_ID_CHARS:sub(index, index)
  end
  return table.concat(id)
end

function ns.InitStore()
  if type(GuildHubDB) ~= "table" or GuildHubDB.version ~= STORE_VERSION then
    GuildHubDB = { version = STORE_VERSION, characters = {} }
  end
  GuildHubDB.accountId = GuildHubDB.accountId or NewAccountId()
  GuildHubDB.relay = GuildHubDB.relay or {}
  -- Accounts nobody has heard of for this long have most likely left the guild.
  local oldest = time() - RELAY_KEPT_DAYS * 24 * 60 * 60
  for accountId, block in pairs(GuildHubDB.relay) do
    if block.at < oldest then
      GuildHubDB.relay[accountId] = nil
    end
  end
end

local function NameKey(name)
  return (name:gsub("^%s+", ""):gsub("%s+$", ""):gsub("%s+", " "):lower())
end

-- Whether a name from GuildHub means this character's name. GuildHub may know a
-- character by its first name only (see src/lib/addon/character-name.ts).
function ns.SameName(gameName, storedName)
  local game, stored = NameKey(gameName), NameKey(storedName)
  if game == stored then
    return true
  end
  local firstName = game:match("^(%S+) ")
  return firstName ~= nil and not stored:find(" ") and stored == firstName
end

-- The character of this account with that realm and name, if the addon knows it.
function ns.OwnCharacter(realm, name)
  for _, character in pairs(GuildHubDB.characters) do
    if character.realm == realm and ns.SameName(character.name, name) then
      return character
    end
  end
end

-- WoW Forever gives characters a first name and a surname; UnitName returns both. The
-- full name is what members see and type into GuildHub.
function ns.PlayerName()
  local firstName, surname = UnitName("player")
  if surname and surname ~= "" then
    return firstName .. " " .. surname, firstName
  end
  return firstName, firstName
end

function ns.CurrentCharacter()
  local realm = GetRealmName()
  local name, firstName = ns.PlayerName()
  local key = realm .. "|" .. name
  local character = GuildHubDB.characters[key]
  if not character then
    -- Versions before 0.4 stored the character under its first name only.
    local oldKey = realm .. "|" .. firstName
    character = GuildHubDB.characters[oldKey]
      or { realm = realm, deaths = 0, professions = {} }
    GuildHubDB.characters[oldKey] = nil
    character.name = name
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
