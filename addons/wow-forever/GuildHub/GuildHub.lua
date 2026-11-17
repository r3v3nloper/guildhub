local addonName, ns = ...

local events = CreateFrame("Frame")

local handlers = {
  ADDON_LOADED = function(loaded)
    if loaded == addonName then
      ns.InitStore()
    end
  end,
  PLAYER_LOGIN = function()
    ns.ReadCharacter()
    ns.ReadSkills()
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
    ns.ReadTradeSkill()
  end,
  CRAFT_SHOW = function()
    ns.ReadCraft()
  end,
  CRAFT_UPDATE = function()
    ns.ReadCraft()
  end,
  -- Feign Death does not fire PLAYER_DEAD, so hunters are not counted twice.
  PLAYER_DEAD = function()
    ns.CountDeath()
  end,
}

for event in pairs(handlers) do
  events:RegisterEvent(event)
end
events:SetScript("OnEvent", function(_, event, ...)
  handlers[event](...)
end)

SLASH_GUILDHUB1 = "/guildhub"
SlashCmdList.GUILDHUB = function()
  ns.ReadCharacter()
  ns.ShowWindow()
end
