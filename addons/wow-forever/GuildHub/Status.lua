local _, ns = ...

-- The status at the top of the /guildhub window: what the addon knows per character,
-- the guild snapshot, and what is still waiting to go to GuildHub.

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

local function SyncStatus()
  local relayed = ns.RelayedAccountCount()
  local text = relayed == 0
    and "Abgleich über die Gilde: noch keine Daten anderer Accounts"
    or ("Abgleich über die Gilde: Daten von " .. relayed .. " weiteren Account"
      .. (relayed == 1 and "" or "s") .. " im Export")
  local queued = ns.SyncQueueLength()
  if queued > 0 then
    text = text .. " |cffffd100– sendet noch (" .. queued .. " Teile)|r"
  end
  return text
end

function ns.StatusText()
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
  table.insert(lines, "")
  table.insert(lines, ns.GuildStatus())
  table.insert(lines, SyncStatus())
  local pending = #ns.PendingActions()
  if pending > 0 then
    table.insert(lines, "|cffffd100" .. pending .. " Antrags-Aktionen noch nicht übertragen: erst exportieren und in "
      .. "GuildHub übernehmen, dann einen neuen Gilden-Stand holen.|r")
  end
  return table.concat(lines, "\n")
end
