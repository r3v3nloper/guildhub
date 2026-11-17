local _, ns = ...

-- The requests tab of the /guildhub window: three lists of rows, each with its buttons.
-- Rows are rebuilt on every refresh; a guild has few enough requests for that.

local ROW_HEIGHT = 20
local GREY = "|cff808080"
local PENDING = " |cffffd100(noch nicht übertragen)|r"

local function ItemText(request)
  return request.quantity .. "x " .. request.item .. (request.pending and PENDING or "")
end

local function ReagentText(request)
  local parts = {}
  for _, reagent in ipairs(ns.RequestReagents(request)) do
    local name = C_Item.GetItemNameByID(reagent.itemId) or ("Item " .. reagent.itemId)
    local color = reagent.have >= reagent.need and "|cff40ff40" or "|cffff6060"
    table.insert(parts, color .. reagent.have .. "/" .. reagent.need .. "|r " .. name)
  end
  return table.concat(parts, ", ")
end

local STATUS = { open = "offen", accepted = "angenommen", done = "erledigt" }

function ns.CreateRequestsPanel(parent)
  local scroll = CreateFrame("ScrollFrame", nil, parent, "UIPanelScrollFrameTemplate")
  local content = CreateFrame("Frame", nil, scroll)
  scroll:SetScrollChild(content)
  local panel = { frame = scroll }
  local lines, buttons = {}, {}

  local function Line(index)
    lines[index] = lines[index] or content:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    local line = lines[index]
    line:ClearAllPoints()
    line:SetJustifyH("LEFT")
    line:Show()
    return line
  end

  local function ButtonAt(index)
    buttons[index] = buttons[index] or CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
    local button = buttons[index]
    button:SetSize(90, ROW_HEIGHT - 2)
    button:ClearAllPoints()
    button:Show()
    return button
  end

  function panel:Refresh()
    for _, line in ipairs(lines) do
      line:Hide()
    end
    for _, button in ipairs(buttons) do
      button:Hide()
    end
    local width = scroll:GetWidth() - 10
    content:SetWidth(width)
    local y, lineCount, buttonCount = 0, 0, 0

    local function AddText(text, indent)
      lineCount = lineCount + 1
      local line = Line(lineCount)
      line:SetPoint("TOPLEFT", indent or 0, -y)
      line:SetWidth(width - (indent or 0) - 200)
      line:SetText(text)
      y = y + math.max(ROW_HEIGHT, line:GetStringHeight() + 4)
      return line
    end

    local function AddButton(label, line, offset, onClick)
      buttonCount = buttonCount + 1
      local button = ButtonAt(buttonCount)
      button:SetText(label)
      button:SetPoint("LEFT", line, "RIGHT", 6 + offset, 0)
      button:SetScript("OnClick", function()
        onClick()
        panel:Refresh()
      end)
    end

    local lists = ns.RequestLists()

    AddText("|cffffd100Kann ich erfüllen|r")
    for _, entry in ipairs(lists.canFulfill) do
      local request, best = entry.request, entry.crafters[1]
      local who = best.name .. (best.knows and "" or " (Rezept unbekannt)")
      local text = ItemText(request) .. " – für " .. table.concat(ns.MemberNames(request.requester), "/")
        .. " – " .. who
      local line = AddText(best.knows and text or (GREY .. text .. "|r"), 8)
      AddButton("Annehmen", line, 0, function()
        ns.RequestAction(request.id, "accept")
      end)
    end
    if #lists.canFulfill == 0 then
      AddText(GREY .. "Nichts für deine Berufe.|r", 8)
    end

    y = y + 6
    AddText("|cffffd100Von mir angenommen|r")
    for _, request in ipairs(lists.accepted) do
      local line = AddText(ItemText(request) .. " – für " .. table.concat(ns.MemberNames(request.requester), "/"), 8)
      AddButton("Erledigt", line, 0, function()
        ns.RequestAction(request.id, "done")
      end)
      AddButton("Zurückgeben", line, 96, function()
        ns.RequestAction(request.id, "return")
      end)
      local reagents = ReagentText(request)
      if reagents ~= "" then
        AddText(reagents, 20)
      end
    end
    if #lists.accepted == 0 then
      AddText(GREY .. "Keine.|r", 8)
    end

    y = y + 6
    AddText("|cffffd100Meine Anträge|r")
    for _, request in ipairs(lists.mine) do
      local status = STATUS[request.status] or request.status
      if request.status == "accepted" and request.crafter then
        status = status .. " von " .. table.concat(ns.MemberNames(request.crafter), "/")
      end
      AddText(ItemText(request) .. " – " .. status, 8)
    end
    if #lists.mine == 0 then
      AddText(GREY .. "Keine. Neue Anträge legst du in GuildHub an.|r", 8)
    end

    content:SetHeight(math.max(y, 1))
  end

  return panel
end
