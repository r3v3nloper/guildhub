local _, ns = ...

-- Who of the guild is online, from the game's guild list. Used for display only; nothing
-- of it is stored or exported.

local online = {}

-- The guild list names characters "Name-Realm" in newer clients; GuildHub only has names.
local function BaseName(name)
  return (name:gsub("%-.*$", "")):lower()
end

function ns.RefreshOnline()
  online = {}
  for i = 1, GetNumGuildMembers() do
    local name, _, _, _, _, _, _, _, isOnline = GetGuildRosterInfo(i)
    if name and isOnline then
      online[BaseName(name)] = true
    end
  end
end

function ns.IsOnline(name)
  return online[BaseName(name)] == true
end

-- Asks the server for a fresh guild list; it answers with GUILD_ROSTER_UPDATE.
function ns.RequestGuildRoster()
  if C_GuildInfo and C_GuildInfo.GuildRoster then
    C_GuildInfo.GuildRoster()
  elseif GuildRoster then
    GuildRoster()
  end
end
