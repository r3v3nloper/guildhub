local _, ns = ...

-- The /guildhub window: the status (Status.lua), and below it one of three views —
-- "export" shows the character export for copying, "import" takes the guild snapshot,
-- "requests" lists the guild's crafting requests.

local WIDTH, HEIGHT = 560, 470
local window

local MODES = {
  export = "Export: Strg+C, dann in GuildHub unter „Aus dem Spiel übernehmen“ einfügen.",
  import = "Gilden-Stand aus GuildHub mit Strg+V einfügen, dann „Übernehmen“.",
  requests = "Annehmen, Erledigt und Zurückgeben gehen mit dem nächsten Export an GuildHub.",
}

local function Refresh(frame)
  frame.status:SetText(ns.StatusText())
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
