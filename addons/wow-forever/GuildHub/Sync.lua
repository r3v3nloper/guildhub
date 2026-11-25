local _, ns = ...

-- Passes account blocks and the guild snapshot on between the guild's addons, over the
-- invisible addon channel of the guild (SPEC 7.3.3). Each addon names which items it has
-- in which version (inventory); whoever has a newer one sends it to the whole guild, and
-- whoever sees a newer one names its own versions again, so the holder learns to send.
--
-- Items: "A<account id>" for an account block, "G" for the guild snapshot.
-- Messages, each below the game's 255 characters:
--   I <seq> <total> <key>:<at> …                one part of a sender's inventory
--   D <key> <at> <seq> <total> <sum> <chunk>    one part of an item; <sum> is the Adler-32
--                                               of the whole item, checked when complete
-- Items travel percent-encoded (spaces, "%" and non-ASCII bytes), so a chunk never splits
-- a character and every message is plain ASCII.

local PREFIX = "GuildHub"
local MESSAGE_LIMIT = 230
local CHUNK_SIZE = 200
local SEND_INTERVAL = 1.1
local RETRY_AFTER = 10
local LOGIN_DELAY = 15
local ANNOUNCE_EVERY = 15 * 60
local ANNOUNCE_DELAY = 5
local SEND_DELAY_MIN, SEND_DELAY_MAX = 2, 8
-- Someone else sending an item keeps this addon quiet about it for this long.
local HEARD_WINDOW = 60
local GUILD_SNAPSHOT = "G"

local queue = {}
local scheduled = {}     -- ["key@at"] = true while a send is waiting for its random pause
local heard = {}         -- ["key@at"] = GetTime() of the last part someone else sent
local incoming = {}      -- ["key@at"] = { total, sum, parts = {} }
local inventories = {}   -- [sender] = { total, parts = {} }
local announceDue = false
local pausedUntil = 0

local function Id(key, at)
  return key .. "@" .. at
end

local function Encode(text)
  return (text:gsub("[%%%s\128-\255]", function(byte)
    return string.format("%%%02X", byte:byte())
  end))
end

local function Decode(text)
  return (text:gsub("%%(%x%x)", function(hex)
    return string.char(tonumber(hex, 16))
  end))
end

-- What this addon can pass on, by key: { at, content }.
local function Items()
  local items = { ["A" .. GuildHubDB.accountId] = ns.OwnBlock() }
  for accountId, block in pairs(GuildHubDB.relay) do
    items["A" .. accountId] = block
  end
  local guild = GuildHubDB.guild
  if guild and guild.createdAt and GuildHubDB.guildText then
    items[GUILD_SNAPSHOT] = { at = guild.createdAt, content = GuildHubDB.guildText }
  end
  return items
end

local function Send()
  local message = queue[1]
  if not message or GetTime() < pausedUntil or not IsInGuild() then
    return
  end
  local result = C_ChatInfo.SendAddonMessage(PREFIX, message, "GUILD")
  local codes = Enum.SendAddonMessageResult
  if result == codes.AddonMessageThrottle or result == codes.ChannelThrottle
      or result == codes.AddOnMessageLockdown then
    -- Throttled, or locked in an instance: the same message goes out later.
    pausedUntil = GetTime() + RETRY_AFTER
    return
  end
  table.remove(queue, 1)
end

-- Groups parts into as few messages as fit.
local function Pack(parts)
  local messages, current, length = {}, {}, 0
  for _, part in ipairs(parts) do
    if #current > 0 and length + #part + 1 > MESSAGE_LIMIT then
      table.insert(messages, current)
      current, length = {}, 0
    end
    table.insert(current, part)
    length = length + #part + 1
  end
  table.insert(messages, current)
  return messages
end

local function Announce()
  announceDue = false
  if not IsInGuild() then
    return
  end
  local parts = {}
  for key, item in pairs(Items()) do
    table.insert(parts, key .. ":" .. item.at)
  end
  local messages = Pack(parts)
  for seq, entries in ipairs(messages) do
    table.insert(queue, "I " .. seq .. " " .. #messages .. " " .. table.concat(entries, " "))
  end
end

local function AnnounceSoon()
  if announceDue then
    return
  end
  announceDue = true
  C_Timer.After(ANNOUNCE_DELAY, Announce)
end

local function IsQueued(key, at)
  local head = "D " .. key .. " " .. at .. " "
  for _, message in ipairs(queue) do
    if message:sub(1, #head) == head then
      return true
    end
  end
  return false
end

local function RecentlyHeard(id)
  return heard[id] ~= nil and GetTime() - heard[id] < HEARD_WINDOW
end

local function QueueItem(key, item)
  local encoded = Encode(item.content)
  local sum = ns.Adler32(item.content)
  local total = math.max(1, math.ceil(#encoded / CHUNK_SIZE))
  for seq = 1, total do
    local chunk = encoded:sub((seq - 1) * CHUNK_SIZE + 1, seq * CHUNK_SIZE)
    table.insert(queue, table.concat({ "D", key, item.at, seq, total, sum, chunk }, " "))
  end
end

-- After a random pause, so that of several holders only the first one sends.
local function SendSoon(key, item)
  local id = Id(key, item.at)
  if scheduled[id] or RecentlyHeard(id) or IsQueued(key, item.at) then
    return
  end
  scheduled[id] = true
  C_Timer.After(math.random(SEND_DELAY_MIN, SEND_DELAY_MAX), function()
    scheduled[id] = nil
    if RecentlyHeard(id) then
      return
    end
    local current = Items()[key]
    if current and current.at == item.at then
      QueueItem(key, current)
    end
  end)
end

local function Compare(theirs)
  local mine = Items()
  for key, at in pairs(theirs) do
    local item = mine[key]
    if not item or item.at < at then
      AnnounceSoon()
    end
  end
  for key, item in pairs(mine) do
    if not theirs[key] or theirs[key] < item.at then
      SendSoon(key, item)
    end
  end
end

local function OnInventory(sender, seq, total, entries)
  local inventory = inventories[sender]
  if not inventory or inventory.total ~= total then
    inventory = { total = total, parts = {} }
    inventories[sender] = inventory
  end
  inventory.parts[seq] = entries
  for i = 1, total do
    if not inventory.parts[i] then
      return
    end
  end
  inventories[sender] = nil
  local theirs = {}
  for i = 1, total do
    for key, at in inventory.parts[i]:gmatch("(%w+):(%d+)") do
      theirs[key] = tonumber(at)
    end
  end
  Compare(theirs)
end

local function Accept(key, at, content)
  if key == GUILD_SNAPSHOT then
    ns.ImportGuild(content, true)
  else
    local accountId = key:sub(2)
    local known = GuildHubDB.relay[accountId]
    -- This account's own block is always its own; a copy from elsewhere is older.
    if accountId ~= GuildHubDB.accountId and (not known or known.at < at) then
      GuildHubDB.relay[accountId] = { at = at, content = content }
    end
  end
  ns.RefreshStatus()
end

local function OnData(key, at, seq, total, sum, chunk)
  local id = Id(key, at)
  heard[id] = GetTime()
  local item = incoming[id]
  if not item or item.total ~= total or item.sum ~= sum then
    item = { total = total, sum = sum, parts = {} }
    incoming[id] = item
  end
  item.parts[seq] = chunk
  for i = 1, total do
    if not item.parts[i] then
      return
    end
  end
  incoming[id] = nil
  local content = Decode(table.concat(item.parts))
  if ns.Adler32(content) == sum then
    Accept(key, at, content)
  end
end

-- The sender may come with or without surname. A message of one's own that slips through
-- does no harm: its versions equal this addon's.
local function IsSelf(sender)
  local name = Ambiguate(sender, "none")
  local fullName, firstName = ns.PlayerName()
  return name == fullName or name == firstName
end

function ns.OnAddonMessage(prefix, text, channel, sender)
  -- Messages the game marks as secret (Midnight addon restrictions) cannot be read.
  if issecretvalue and (issecretvalue(prefix) or issecretvalue(text) or issecretvalue(sender)) then
    return
  end
  if prefix ~= PREFIX or channel ~= "GUILD" or IsSelf(sender) then
    return
  end
  local kind = text:sub(1, 1)
  if kind == "I" then
    local seq, total, entries = text:match("^I (%d+) (%d+) ?(.*)$")
    if seq then
      OnInventory(sender, tonumber(seq), tonumber(total), entries)
    end
  elseif kind == "D" then
    local key, at, seq, total, sum, chunk = text:match("^D (%w+) (%d+) (%d+) (%d+) (%x+) (%S*)$")
    if key then
      OnData(key, tonumber(at), tonumber(seq), tonumber(total), sum, chunk)
    end
  end
end

-- Called after the addon read something about this account; the guild hears of it shortly,
-- but only when the account's block really changed.
function ns.SyncChanged()
  local before = GuildHubDB.ownBlock and GuildHubDB.ownBlock.at
  if ns.OwnBlock().at ~= before then
    AnnounceSoon()
  end
end

-- Parts still to send: shown in the status, so a member knows to stay online a little.
function ns.SyncQueueLength()
  return #queue
end

function ns.StartSync()
  C_ChatInfo.RegisterAddonMessagePrefix(PREFIX)
  C_Timer.NewTicker(SEND_INTERVAL, Send)
  C_Timer.After(LOGIN_DELAY, Announce)
  C_Timer.NewTicker(ANNOUNCE_EVERY, Announce)
end
