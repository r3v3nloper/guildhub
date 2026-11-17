local _, ns = ...

-- The /guildhub window: what the addon knows per character, and the export to copy.

local WIDTH, HEIGHT = 520, 440
local window

local function FormatDate(timestamp)
  return timestamp and date("%d.%m.%Y", timestamp) or nil
end

local function ProfessionName(skillLineId)
  local names = ns.professionNames[skillLineId]
  if not names then
    return tostring(skillLineId)
  end
  return names[GetLocale():sub(1, 2)] or names.en or select(2, next(names))
end

local function StatusText()
  local lines = {}
  for _, character in ipairs(ns.SortedCharacters()) do
    local professions = {}
    for skillLineId, profession in pairs(character.professions) do
      local readAt = FormatDate(profession.readAt)
      table.insert(professions, ProfessionName(skillLineId) .. " " .. (profession.skill or "?")
        .. (readAt and (" (Rezepte " .. readAt .. ")") or " (Berufsfenster noch nicht geöffnet)"))
    end
    table.sort(professions)
    table.insert(lines, "|cffffd100" .. character.name .. "|r – " .. character.realm .. ", Stufe "
      .. (character.level or "?") .. ", Tode " .. (character.deaths or 0))
    for _, line in ipairs(professions) do
      table.insert(lines, "   " .. line)
    end
  end
  if ns.skillsIncomplete then
    table.insert(lines, "|cffff6060Im Fertigkeitenfenster ist eine Gruppe zugeklappt; Berufe darin fehlen evtl.|r")
  end
  if ns.recipeApiMissing then
    table.insert(lines, "|cffff6060Dieser Client gibt keine Rezept-IDs heraus; Rezepte fehlen im Export.|r")
  end
  return table.concat(lines, "\n")
end

local function CreateWindow()
  local frame = CreateFrame("Frame", "GuildHubFrame", UIParent, "BasicFrameTemplateWithInset")
  frame:SetSize(WIDTH, HEIGHT)
  frame:SetPoint("CENTER")
  frame:SetMovable(true)
  frame:EnableMouse(true)
  frame:RegisterForDrag("LeftButton")
  frame:SetScript("OnDragStart", frame.StartMoving)
  frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
  frame:SetFrameStrata("DIALOG")
  tinsert(UISpecialFrames, "GuildHubFrame")

  frame.title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
  frame.title:SetPoint("TOP", 0, -6)
  frame.title:SetText("GuildHub")

  frame.status = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  frame.status:SetPoint("TOPLEFT", 16, -34)
  frame.status:SetPoint("TOPRIGHT", -16, -34)
  frame.status:SetJustifyH("LEFT")
  frame.status:SetJustifyV("TOP")
  frame.status:SetHeight(180)

  local hint = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  hint:SetPoint("TOPLEFT", 16, -222)
  hint:SetText("Export: Strg+C, dann in GuildHub unter „Aus dem Spiel übernehmen“ einfügen.")

  local scroll = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
  scroll:SetPoint("TOPLEFT", 16, -242)
  scroll:SetPoint("BOTTOMRIGHT", -34, 16)

  local box = CreateFrame("EditBox", nil, scroll)
  box:SetMultiLine(true)
  box:SetMaxLetters(0)
  box:SetAutoFocus(false)
  box:SetFontObject(ChatFontSmall)
  box:SetWidth(WIDTH - 60)
  box:SetScript("OnEscapePressed", function()
    frame:Hide()
  end)
  -- The text is for copying only; typing would break the checksum.
  box:SetScript("OnTextChanged", function(self, userInput)
    if userInput then
      self:SetText(frame.export)
      self:HighlightText()
    end
  end)
  scroll:SetScrollChild(box)
  frame.box = box

  return frame
end

function ns.ShowWindow()
  window = window or CreateWindow()
  window.status:SetText(StatusText())
  window.export = ns.BuildExport()
  window.box:SetText(window.export)
  window:Show()
  window.box:SetFocus()
  window.box:HighlightText()
end
