local _, ns = ...

-- Crafting requests in the game (SPEC 7.3.2), from the guild snapshot. Accept, done and
-- give back are remembered as pending actions, shown at once, and sent with the next
-- export; GuildHub checks them against its current state. A newer guild snapshot already
-- contains their effect, so it clears them.

local REAGENTS = 3

local function Pending()
  GuildHubDB.pending = GuildHubDB.pending or {}
  return GuildHubDB.pending
end

local function FindRequest(id)
  for _, request in ipairs(GuildHubDB.guild and GuildHubDB.guild.requests or {}) do
    if request.id == id then
      return request
    end
  end
end

-- The state as the member sees it: the snapshot with the pending actions applied.
local function ApplyLocally(request, action, self)
  if action == "accept" then
    request.status, request.crafter = "accepted", self
  elseif action == "return" then
    request.status, request.crafter = "open", nil
  elseif action == "done" then
    request.status = "done"
  end
  request.pending = true
end

function ns.RequestAction(id, action)
  local guild = GuildHubDB.guild
  local request = FindRequest(id)
  if not guild or not request then
    return
  end
  table.insert(Pending(), { id = id, action = action, at = time() })
  ApplyLocally(request, action, guild.self)
end

function ns.PendingActions()
  return Pending()
end

-- Called after a guild snapshot was read in.
function ns.ClearPendingBefore(createdAt)
  local kept = {}
  for _, action in ipairs(Pending()) do
    if action.at > createdAt then
      table.insert(kept, action)
      local request = FindRequest(action.id)
      if request then
        ApplyLocally(request, action.action, GuildHubDB.guild.self)
      end
    end
  end
  GuildHubDB.pending = kept
end

-- The own characters of this account that have the profession, best skill first.
local function OwnCrafters(profession, spell)
  local crafters = {}
  for _, character in ipairs(ns.SortedCharacters()) do
    local own = character.professions[profession]
    if own then
      table.insert(crafters, {
        name = character.name,
        skill = own.skill,
        knows = spell and own.recipes[spell] or false,
      })
    end
  end
  table.sort(crafters, function(a, b)
    if a.knows ~= b.knows then
      return a.knows
    end
    return (a.skill or 0) > (b.skill or 0)
  end)
  return crafters
end

-- Reagents of a request with what the logged-in character has in bags and bank.
function ns.RequestReagents(request)
  local data = request.spell and ns.recipes[request.profession]
    and ns.recipes[request.profession][request.spell]
  local reagents = {}
  if not data then
    return reagents
  end
  local list = data[REAGENTS]
  for i = 1, #list, 2 do
    local itemId = list[i]
    table.insert(reagents, {
      itemId = itemId,
      need = list[i + 1] * (request.quantity or 1),
      have = GetItemCount(itemId, true),
    })
  end
  return reagents
end

-- The three lists of the requests tab.
function ns.RequestLists()
  local guild = GuildHubDB.guild
  local lists = { canFulfill = {}, accepted = {}, mine = {} }
  if not guild then
    return lists
  end
  for _, request in ipairs(guild.requests) do
    if request.requester == guild.self then
      table.insert(lists.mine, request)
    elseif request.status == "accepted" and request.crafter == guild.self then
      table.insert(lists.accepted, request)
    elseif request.status == "open" then
      local crafters = OwnCrafters(request.profession, request.spell)
      if #crafters > 0 then
        table.insert(lists.canFulfill, { request = request, crafters = crafters })
      end
    end
  end
  return lists
end

-- Names of a member's characters, for "Thrall ist online" and "angenommen von".
function ns.MemberNames(memberNumber)
  local member = GuildHubDB.guild and GuildHubDB.guild.members[memberNumber]
  local names = {}
  for _, character in ipairs(member and member.characters or {}) do
    table.insert(names, character.name)
  end
  return names
end
