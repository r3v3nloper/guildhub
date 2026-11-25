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

-- WoW Forever 1.60.1 names no realm to addons (GetRealmName and GetNormalizedRealmName
-- return "", and UnitFullName gives the surname where Retail has the realm). Characters are
-- then stored with realm "", and realms count only where both sides name one.
local function SameRealm(a, b)
  return a == "" or b == "" or a == b
end

local function RealmName()
  local realm = GetRealmName()
  if (not realm or realm == "") and GetNormalizedRealmName then
    realm = GetNormalizedRealmName()
  end
  return realm or ""
end

-- The character of this account with that realm and name, if the addon knows it.
function ns.OwnCharacter(realm, name)
  for _, character in pairs(GuildHubDB.characters) do
    if SameRealm(character.realm or "", realm or "") and ns.SameName(character.name, name) then
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

-- Folds what another entry of the same character knows into this one: recipes are only
-- ever added, and deaths only ever count up.
local function Absorb(character, other)
  character.deaths = math.max(character.deaths or 0, other.deaths or 0)
  for skillLineId, theirs in pairs(other.professions or {}) do
    local mine = character.professions[skillLineId]
    if mine then
      for spellId in pairs(theirs.recipes) do
        mine.recipes[spellId] = true
      end
      mine.skill = math.max(mine.skill or 0, theirs.skill or 0)
      mine.readAt = math.max(mine.readAt or 0, theirs.readAt or 0)
    end
  end
end

-- Keys of other entries of the logged-in character, left by earlier versions: before 0.4
-- under the first name alone, with the realm the client named then; 0.4.0 without realm.
local function EarlierKeys(key, realm, name, firstName)
  local keys = {}
  for otherKey, other in pairs(GuildHubDB.characters) do
    local otherName = NameKey(other.name or "")
    if otherKey ~= key and SameRealm(other.realm or "", realm)
        and (otherName == NameKey(name) or otherName == NameKey(firstName)) then
      table.insert(keys, otherKey)
    end
  end
  -- The realm-less entry holds the most recent data, so it becomes the base if needed.
  table.sort(keys, function(a, b)
    return (GuildHubDB.characters[a].realm or "") < (GuildHubDB.characters[b].realm or "")
  end)
  return keys
end

-- Nil while the game does not name the character yet.
function ns.CurrentCharacter()
  local realm = RealmName()
  local name, firstName = ns.PlayerName()
  if not name or name == "" then
    return nil
  end
  local key = realm .. "|" .. name
  local character = GuildHubDB.characters[key]
  for _, otherKey in ipairs(EarlierKeys(key, realm, name, firstName)) do
    local other = GuildHubDB.characters[otherKey]
    GuildHubDB.characters[otherKey] = nil
    if character then
      Absorb(character, other)
    else
      character = other
    end
  end
  character = character or { deaths = 0, professions = {} }
  GuildHubDB.characters[key] = character
  character.realm = realm
  character.name = name
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
