local _, ns = ...

-- Reads the guild snapshot GuildHub hands out ("Für das Addon kopieren"), in the format
-- of src/lib/addon/guild-snapshot.ts:
--   T,<unix seconds>  S,<member>  M  C,<realm>,<name>  K,<profession>,<skill>[,<spell>…]
--   R,<id>,<status>,<requester>,<crafter>,<profession>,<spell>,<quantity>,<item>,<notes>
-- It is stored in GuildHubDB.guild and replaced as a whole by the next one.

local FORMAT_VERSION = 1
local STALE_AFTER_DAYS = 7

local function Unescape(text)
  return (text:gsub("%%(%x%x)", function(hex)
    return string.char(tonumber(hex, 16))
  end))
end

-- Keeps empty fields, which gmatch("[^,]+") would drop.
local function SplitFields(record)
  local fields = {}
  for value in (record .. ","):gmatch("([^,]*),") do
    table.insert(fields, value)
  end
  return fields
end

local function ReadRecords(payload)
  local guild = { members = {}, requests = {} }
  local member, character
  for record in payload:gmatch("[^;]+") do
    local f = SplitFields(record)
    local kind = f[1]
    if kind == "T" then
      guild.createdAt = tonumber(f[2])
    elseif kind == "S" then
      guild.self = tonumber(f[2])
    elseif kind == "M" then
      member = { characters = {} }
      table.insert(guild.members, member)
    elseif kind == "C" and member then
      character = { realm = Unescape(f[2]), name = Unescape(f[3]), professions = {} }
      table.insert(member.characters, character)
    elseif kind == "K" and character then
      local profession = { skill = tonumber(f[3]), spells = {} }
      for i = 4, #f do
        profession.spells[tonumber(f[i])] = true
      end
      character.professions[tonumber(f[2])] = profession
    elseif kind == "R" then
      table.insert(guild.requests, {
        id = tonumber(f[2]),
        status = f[3],
        requester = tonumber(f[4]),
        crafter = tonumber(f[5]),
        profession = tonumber(f[6]),
        spell = tonumber(f[7]),
        quantity = tonumber(f[8]),
        item = Unescape(f[9] or ""),
        notes = (f[10] and f[10] ~= "") and Unescape(f[10]) or nil,
      })
    end
    -- Unknown record types come from a newer GuildHub and are skipped.
  end
  return guild
end

-- Returns nil on success, otherwise the message to show.
function ns.ImportGuild(text)
  local cleaned = text:gsub("[\r\n]", ""):match("^%s*(.-)%s*$")
  local version, gameId, kind, checksum, payload = cleaned:match("^GH(%d+):([%w%-]+):(%a+):(%x+):(.*)$")
  if not version then
    return "Das ist kein Gilden-Stand aus GuildHub. Bitte komplett kopieren."
  end
  if tonumber(version) ~= FORMAT_VERSION then
    return "Dieser Gilden-Stand passt nicht zu dieser Addon-Version. Bitte das Addon aktualisieren."
  end
  if ns.Adler32(gameId .. ":" .. kind .. ":" .. payload) ~= checksum then
    return "Der Text ist unvollständig oder verändert. Bitte erneut komplett kopieren."
  end
  if gameId ~= ns.gameId then
    return "Der Gilden-Stand gehört zu einem anderen Spiel."
  end
  if kind ~= "guild" then
    return "Das ist ein Export aus dem Addon, er gehört in GuildHub."
  end
  GuildHubDB.guild = ReadRecords(payload)
  ns.ClearPendingBefore(GuildHubDB.guild.createdAt or 0)
  return nil
end

function ns.GuildStatus()
  local guild = GuildHubDB.guild
  if not guild or not guild.createdAt then
    return "Noch kein Gilden-Stand. In GuildHub „Für das Addon kopieren“ und hier einfügen."
  end
  local text = "Gilden-Stand vom " .. date("%d.%m.%Y %H:%M", guild.createdAt)
    .. ": " .. #guild.members .. " Mitglieder, " .. #guild.requests .. " Anträge"
  if time() - guild.createdAt > STALE_AFTER_DAYS * 24 * 60 * 60 then
    text = text .. " |cffff6060– älter als " .. STALE_AFTER_DAYS .. " Tage, bitte neu holen|r"
  end
  return text
end
