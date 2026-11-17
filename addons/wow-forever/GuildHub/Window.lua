local _, ns = ...

-- The /guildhub window: what the addon knows, and below it one of three views —
-- "export" shows the character export for copying, "import" takes the guild snapshot,
-- "requests" lists the guild's crafting requests.

local WIDTH, HEIGHT = 560, 470
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
  table.insert(lines, "")
  table.insert(lines, ns.GuildStatus())
  local pending = #ns.PendingActions()
  if pending > 0 then
    table.insert(lines, "|cffffd100" .. pending .. " Antrags-Aktionen noch nicht übertragen: erst exportieren und in "
      .. "GuildHub übernehmen, dann einen neuen Gilden-Stand holen.|r")
  end
  return table.concat(lines, "\n")
end

local MODES = {
  export = "Export: Strg+C, dann in GuildHub unter „Aus dem Spiel übernehmen“ einfügen.",
  import = "Gilden-Stand aus GuildHub mit Strg+V einfügen, dann „Übernehmen“.",
  requests = "Annehmen, Erledigt und Zurückgeben gehen mit dem nächsten Export an GuildHub.",
}

local function Refresh(frame)
  frame.status:SetText(StatusText())
  frame.hint:SetText(frame.message or MODES[frame.mode])
  frame.apply:SetShown(frame.mode == "import")
  frame.scroll:SetShown(frame.mode ~= "requests")
  frame.requests.frame:SetShown(frame.mode == "requests")
  if frame.mode == "requests" then
    frame.box:ClearFocus()
    frame.requests:Refresh()
  elseif frame.mode == "export" then
    frame.export = ns.BuildExport()
    frame.box:SetText(frame.export)
    frame.box:SetFocus()
    frame.box:HighlightText()
  else
    frame.box:SetText("")
    frame.box:SetFocus()
  end
end

local function SetMode(frame, mode)
  frame.mode = mode
  frame.message = nil
  Refresh(frame)
end

local function CreateButton(parent, label, width, onClick)
  local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
  button:SetSize(width, 22)
  button:SetText(label)
  button:SetScript("OnClick", onClick)
  return button
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
  frame.status:SetHeight(190)

  local exportButton = CreateButton(frame, "Export", 110, function()
    SetMode(frame, "export")
  end)
  exportButton:SetPoint("TOPLEFT", 14, -230)
  local importButton = CreateButton(frame, "Gilden-Stand einfügen", 160, function()
    SetMode(frame, "import")
  end)
  importButton:SetPoint("LEFT", exportButton, "RIGHT", 6, 0)
  local requestsButton = CreateButton(frame, "Anträge", 100, function()
    SetMode(frame, "requests")
  end)
  requestsButton:SetPoint("LEFT", importButton, "RIGHT", 6, 0)
  frame.apply = CreateButton(frame, "Übernehmen", 110, function()
    frame.message = ns.ImportGuild(frame.box:GetText()) or "|cff60ff60Gilden-Stand übernommen.|r"
    frame.mode = "import"
    Refresh(frame)
  end)
  frame.apply:SetPoint("TOPRIGHT", -16, -230)

  frame.hint = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
  frame.hint:SetPoint("TOPLEFT", 16, -258)
  frame.hint:SetPoint("TOPRIGHT", -16, -258)
  frame.hint:SetJustifyH("LEFT")

  local scroll = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
  scroll:SetPoint("TOPLEFT", 16, -276)
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
  -- The export is for copying only; typing would break its checksum.
  box:SetScript("OnTextChanged", function(self, userInput)
    if userInput and frame.mode == "export" then
      self:SetText(frame.export)
      self:HighlightText()
    end
  end)
  scroll:SetScrollChild(box)
  frame.box = box
  frame.scroll = scroll

  frame.requests = ns.CreateRequestsPanel(frame)
  frame.requests.frame:SetPoint("TOPLEFT", 16, -276)
  frame.requests.frame:SetPoint("BOTTOMRIGHT", -34, 16)

  return frame
end

function ns.ShowWindow()
  window = window or CreateWindow()
  window:Show()
  SetMode(window, "export")
end
