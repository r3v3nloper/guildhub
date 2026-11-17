local _, ns = ...

-- The "GuildHub" block under item tooltips (SPEC 7.3.1). Without a guild snapshot, or
-- when nothing matches, the tooltip stays as it is.

local SHOWN_KNOWERS = 3
local HEADER_COLOR = { 0.53, 0.75, 1 }
local ONLINE_COLOR = "|cff40ff40"
local OFFLINE_COLOR = "|cffc0c0c0"

local function KnowerText(knower)
  local text = (knower.online and ONLINE_COLOR or OFFLINE_COLOR) .. knower.name .. "|r"
  if knower.skill then
    text = text .. " (" .. knower.skill .. ")"
  end
  if knower.isSelf then
    text = text .. " (du)"
  end
  return text
end

local function AddKnowers(tooltip, label, knowers)
  local names = {}
  for i = 1, math.min(#knowers, SHOWN_KNOWERS) do
    table.insert(names, KnowerText(knowers[i]))
  end
  local more = #knowers - SHOWN_KNOWERS
  if more > 0 then
    table.insert(names, "+ " .. more .. " weitere")
  end
  tooltip:AddLine(label .. " " .. table.concat(names, ", "), 1, 1, 1, true)
end

local function Lines(itemId)
  local lines = {}
  local crafters = ns.CraftersOf(itemId)
  if #crafters > 0 then
    table.insert(lines, function(tooltip)
      AddKnowers(tooltip, "Herstellbar von:", crafters)
    end)
  end
  local knowers, teaches = ns.KnowersOfRecipeItem(itemId)
  if teaches then
    table.insert(lines, function(tooltip)
      if #knowers > 0 then
        AddKnowers(tooltip, "Schon bekannt bei:", knowers)
      else
        tooltip:AddLine("In der Gilde noch unbekannt", 1, 0.82, 0)
      end
    end)
  end
  local demand = ns.ReagentDemand(itemId)
  if demand.ownRequests > 0 then
    table.insert(lines, function(tooltip)
      tooltip:AddLine("Du brauchst " .. demand.ownCount .. " für " .. demand.ownRequests
        .. (demand.ownRequests == 1 and " angenommenen Antrag" or " angenommene Anträge"), 1, 0.82, 0)
    end)
  elseif demand.requests > 0 then
    table.insert(lines, function(tooltip)
      tooltip:AddLine("Gebraucht für " .. demand.requests
        .. (demand.requests == 1 and " offenen Antrag" or " offene Anträge"), 1, 1, 1)
    end)
  end
  return lines
end

-- Item tooltip data carries the item ID; the link is the way back should it be missing.
local function ItemIdOf(tooltip, data)
  if data and type(data.id) == "number" then
    return data.id
  end
  if not tooltip.GetItem then
    return nil
  end
  local _, link = tooltip:GetItem()
  return link and tonumber(link:match("item:(%d+)"))
end

local function AddGuildHubBlock(tooltip, data)
  if not GuildHubDB or not GuildHubDB.guild or GuildHubDB.tooltipOff then
    return
  end
  local itemId = ItemIdOf(tooltip, data)
  if not itemId then
    return
  end
  local lines = Lines(itemId)
  if #lines == 0 then
    return
  end
  tooltip:AddLine(" ")
  tooltip:AddLine("GuildHub", unpack(HEADER_COLOR))
  for _, addLine in ipairs(lines) do
    addLine(tooltip)
  end
  tooltip:Show()
end

function ns.HookTooltips()
  TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Item, AddGuildHubBlock)
end
