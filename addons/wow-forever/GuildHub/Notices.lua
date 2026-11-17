local _, ns = ...

-- "Thrall ist online: dein Antrag Arkanitstange (angenommen)" (SPEC 7.3.2): once per
-- session and request, in the chat frame for the player alone. The name is a link that
-- opens a whisper; nothing is sent by itself.

local notified = {}

local function PlayerLink(name)
  return "|Hplayer:" .. name .. "|h[" .. name .. "]|h"
end

local function OnlineName(memberNumber)
  for _, name in ipairs(ns.MemberNames(memberNumber)) do
    if ns.IsOnline(name) then
      return name
    end
  end
end

function ns.NotifyOnline()
  local guild = GuildHubDB.guild
  if not guild or GuildHubDB.noticesOff then
    return
  end
  for _, request in ipairs(guild.requests) do
    if request.status == "accepted" and not notified[request.id] then
      local mine = request.requester == guild.self
      local other = mine and request.crafter or (request.crafter == guild.self and request.requester)
      local name = other and other ~= guild.self and OnlineName(other)
      if name then
        notified[request.id] = true
        local role = mine and "dein Antrag (angenommen)" or "Antrag, den du angenommen hast"
        DEFAULT_CHAT_FRAME:AddMessage("|cff88bfffGuildHub:|r " .. PlayerLink(name) .. " ist online – " .. role
          .. ": " .. request.quantity .. "x " .. request.item)
      end
    end
  end
end
