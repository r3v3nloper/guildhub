local _, ns = ...

-- Reads what the game tells about the logged-in character. Professions come from the
-- skill list, recipes only from an open profession window: the game knows them nowhere
-- else.

function ns.ReadCharacter()
  local character = ns.CurrentCharacter()
  character.faction = UnitFactionGroup("player")
  local _, raceToken = UnitRace("player")
  local _, classToken = UnitClass("player")
  character.race = raceToken
  character.class = classToken
  character.level = UnitLevel("player")
end

function ns.ReadSkills()
  local character = ns.CurrentCharacter()
  local seen, complete = {}, true
  for i = 1, GetNumSkillLines() do
    local name, isHeader, isExpanded, rank = GetSkillLineInfo(i)
    if isHeader then
      -- Skills under a collapsed header are not listed; the player's choice stays.
      complete = complete and isExpanded
    elseif ns.professionIds[name] then
      seen[ns.professionIds[name]] = true
      ns.Profession(character, ns.professionIds[name]).skill = rank
    end
  end
  ns.skillsIncomplete = not complete
  if not complete then
    return
  end
  -- A profession given up in the game is dropped here; GuildHub asks before it follows.
  for skillLineId in pairs(character.professions) do
    if not seen[skillLineId] then
      character.professions[skillLineId] = nil
    end
  end
end

local function SpellIdOf(link)
  if not link then
    return nil
  end
  return tonumber(link:match("enchant:(%d+)") or link:match("spell:(%d+)"))
end

-- Recipes are only ever added: a filter in the profession window hides some of them,
-- and that must not look as if they were forgotten.
local function StoreRecipes(professionName, rank, count, readRecipe)
  local skillLineId = ns.professionIds[professionName]
  if not skillLineId then
    return
  end
  local profession = ns.Profession(ns.CurrentCharacter(), skillLineId)
  profession.skill = rank or profession.skill
  for i = 1, count do
    local spellId = readRecipe(i)
    if spellId then
      profession.recipes[spellId] = true
    end
  end
  profession.readAt = time()
end

function ns.ReadTradeSkill()
  if not GetTradeSkillRecipeLink then
    ns.recipeApiMissing = true
    return
  end
  local name, rank = GetTradeSkillLine()
  StoreRecipes(name, rank, GetNumTradeSkills(), function(i)
    local _, skillType = GetTradeSkillInfo(i)
    return skillType ~= "header" and SpellIdOf(GetTradeSkillRecipeLink(i))
  end)
end

-- Enchanting uses the older craft window in the Classic client.
function ns.ReadCraft()
  if not GetCraftRecipeLink then
    ns.recipeApiMissing = true
    return
  end
  local name, rank = GetCraftDisplaySkillLine()
  StoreRecipes(name, rank, GetNumCrafts(), function(i)
    local _, _, craftType = GetCraftInfo(i)
    return craftType ~= "header" and SpellIdOf(GetCraftRecipeLink(i))
  end)
end

function ns.CountDeath()
  local character = ns.CurrentCharacter()
  character.deaths = (character.deaths or 0) + 1
end
