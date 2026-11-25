local _, ns = ...

-- Who of the guild is online, from the game's guild list. Used for display only; nothing
-- of it is stored or exported.

-- Online characters by name key, each with the name the game uses, e.g. for whispers.
local online = {}

-- The guild list names characters "Name-Realm"; GuildHub only has names, in WoW Forever
-- with surname ("Relitia Relikt"). Should the list carry first names only, a GuildHub
-- name is found by its first name.
local function NameKey(name)
  return (name:gsub("%-.*$", ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub("%s+", " "):lower())
end

local function FirstNameKey(name)
  return "first:" .. (NameKey(name):match("^%S+") or "")
end

function ns.RefreshOnline()
  online = {}
  for i = 1, GetNumGuildMembers() do
    local name, _, _, _, _, _, _, _, isOnline = GetGuildRosterInfo(i)
    if name and isOnline then
      local gameName = name:gsub("%-.*$", "")
      online[NameKey(name)] = gameName
      if not NameKey(name):find(" ") then
        online[FirstNameKey(name)] = gameName
      end
    end
  end
end

-- The game's name of the character when it is online, otherwise nil.
function ns.IsOnline(name)
  return online[NameKey(name)] or online[FirstNameKey(name)]
end

-- Asks the server for a fresh guild list; it answers with GUILD_ROSTER_UPDATE.
function ns.RequestGuildRoster()
  if C_GuildInfo and C_GuildInfo.GuildRoster then
    C_GuildInfo.GuildRoster()
  elseif GuildRoster then
    GuildRoster()
  end
end
