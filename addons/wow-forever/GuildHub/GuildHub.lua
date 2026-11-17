local addonName, ns = ...

local events = CreateFrame("Frame")

-- The profession windows fire their update event on every scroll and filter change;
-- reading all recipes once things have settled is enough.
local READ_DELAY = 0.5
local scheduled = {}

local function ReadSoon(read)
  if not C_Timer then
    read()
    return
  end
  if scheduled[read] then
    return
  end
  scheduled[read] = true
  C_Timer.After(READ_DELAY, function()
    scheduled[read] = nil
    read()
  end)
end

local handlers = {
  ADDON_LOADED = function(loaded)
    if loaded == addonName then
      ns.InitStore()
      ns.HookTooltips()
    end
  end,
  PLAYER_LOGIN = function()
    ns.ReadCharacter()
    ns.ReadSkills()
    ns.RequestGuildRoster()
  end,
  PLAYER_LEVEL_UP = function()
    ns.ReadCharacter()
  end,
  SKILL_LINES_CHANGED = function()
    ns.ReadSkills()
  end,
  TRADE_SKILL_SHOW = function()
    ns.ReadTradeSkill()
  end,
  TRADE_SKILL_UPDATE = function()
    ReadSoon(ns.ReadTradeSkill)
  end,
  CRAFT_SHOW = function()
    ns.ReadCraft()
  end,
  CRAFT_UPDATE = function()
    ReadSoon(ns.ReadCraft)
  end,
  -- Feign Death does not fire PLAYER_DEAD, so hunters are not counted twice.
  PLAYER_DEAD = function()
    ns.CountDeath()
  end,
  GUILD_ROSTER_UPDATE = function()
    ns.RefreshOnline()
    ns.NotifyOnline()
  end,
}

for event in pairs(handlers) do
  events:RegisterEvent(event)
end
events:SetScript("OnEvent", function(_, event, ...)
  handlers[event](...)
end)

local commands = {
  tooltip = function()
    GuildHubDB.tooltipOff = not GuildHubDB.tooltipOff
    print("GuildHub: Tooltip " .. (GuildHubDB.tooltipOff and "aus" or "an") .. ".")
  end,
  hinweise = function()
    GuildHubDB.noticesOff = not GuildHubDB.noticesOff
    print("GuildHub: Online-Hinweise " .. (GuildHubDB.noticesOff and "aus" or "an") .. ".")
  end,
}

SLASH_GUILDHUB1 = "/guildhub"
SlashCmdList.GUILDHUB = function(input)
  local command = commands[(input or ""):lower():match("^%s*(%S*)")]
  if command then
    command()
    return
  end
  ns.ReadCharacter()
  ns.RequestGuildRoster()
  ns.ShowWindow()
end
