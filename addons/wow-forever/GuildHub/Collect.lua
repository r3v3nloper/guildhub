local _, ns = ...

-- Reads what the game tells about the logged-in character. WoW Forever runs on the Mainline
-- (Retail) client, so professions come from the profession book and recipes from the
-- profession window through C_TradeSkillUI; the game knows the recipes nowhere else.

function ns.ReadCharacter()
  local character = ns.CurrentCharacter()
  character.faction = UnitFactionGroup("player")
  local _, raceToken = UnitRace("player")
  local _, classToken = UnitClass("player")
  character.race = raceToken
  character.class = classToken
  character.level = UnitLevel("player")
end

-- The pack knows professions by their skill line. Should the client report a child skill
-- line (as Retail does per expansion), its parent is the one the pack knows.
local function PackSkillLine(skillLineId, name)
  if skillLineId and ns.professionNames[skillLineId] then
    return skillLineId
  end
  if name and ns.professionIds[name] then
    return ns.professionIds[name]
  end
  local info = skillLineId and C_TradeSkillUI.GetProfessionInfoBySkillLineID(skillLineId)
  local parent = info and info.parentProfessionID
  if parent and ns.professionNames[parent] then
    return parent
  end
end

function ns.ReadSkills()
  local character = ns.CurrentCharacter()
  local seen = {}
  for _, index in pairs({ GetProfessions() }) do
    local name, _, rank, _, _, _, skillLine = GetProfessionInfo(index)
    local skillLineId = PackSkillLine(skillLine, name)
    if skillLineId then
      seen[skillLineId] = true
      ns.Profession(character, skillLineId).skill = rank
    end
  end
  -- A profession given up in the game is dropped here; GuildHub asks before it follows.
  for skillLineId in pairs(character.professions) do
    if not seen[skillLineId] then
      character.professions[skillLineId] = nil
    end
  end
end

-- A linked, guild or NPC profession window shows someone else's recipes.
local function ShowsOwnProfession()
  return not (C_TradeSkillUI.IsTradeSkillLinked() or C_TradeSkillUI.IsTradeSkillGuild()
    or C_TradeSkillUI.IsNPCCrafting())
end

-- GetAllRecipeIDs is not in Forever's API documentation, while Blizzard's own profession
-- window uses GetFilteredRecipeIDs; the filtered list suffices because recipes are only added.
local function RecipeIds()
  local list = C_TradeSkillUI.GetAllRecipeIDs or C_TradeSkillUI.GetFilteredRecipeIDs
  return list and list() or {}
end

-- Recipes are only ever added: a filter in the profession window hides some of them,
-- and that must not look as if they were forgotten.
function ns.ReadTradeSkill()
  if not C_TradeSkillUI or not ShowsOwnProfession() then
    return
  end
  local info = C_TradeSkillUI.GetBaseProfessionInfo()
  local skillLineId = info and PackSkillLine(info.professionID, info.professionName)
  if not skillLineId then
    return
  end
  local profession = ns.Profession(ns.CurrentCharacter(), skillLineId)
  if info.skillLevel and info.skillLevel > 0 then
    profession.skill = info.skillLevel
  end
  for _, recipeId in ipairs(RecipeIds()) do
    local recipe = C_TradeSkillUI.GetRecipeInfo(recipeId)
    if recipe and recipe.learned then
      profession.recipes[recipe.recipeID] = true
    end
  end
  profession.readAt = time()
end

function ns.CountDeath()
  local character = ns.CurrentCharacter()
  character.deaths = (character.deaths or 0) + 1
end
