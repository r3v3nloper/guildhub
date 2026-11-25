local _, ns = ...

-- Questions the tooltip asks about the guild snapshot (SPEC 7.3.1): who can craft an
-- item, who already knows a recipe, and which requests need a reagent. Item → recipe
-- comes from Data.lua (ns.RecipeData), who knows which recipe from GuildHubDB.guild.

local byMadeItem, byRecipeItem

-- Item ID → list of { profession, spell }; built once, Data.lua never changes at runtime.
local function BuildItemIndex()
  byMadeItem, byRecipeItem = {}, {}
  local function Add(index, item, entry)
    index[item] = index[item] or {}
    table.insert(index[item], entry)
  end
  ns.EachRecipe(function(profession, spell, recipe)
    local entry = { profession = profession, spell = spell }
    if recipe.made then
      Add(byMadeItem, recipe.made, entry)
    end
    for _, item in ipairs(recipe.recipeItems) do
      Add(byRecipeItem, item, entry)
    end
  end)
end

-- Characters of the guild that know one of the recipes, each once, with their skill.
local function Knowers(recipes)
  local guild = GuildHubDB.guild
  local knowers = {}
  if not guild or not recipes then
    return knowers
  end
  for memberNumber, member in ipairs(guild.members) do
    for _, character in ipairs(member.characters) do
      for _, recipe in ipairs(recipes) do
        local profession = character.professions[recipe.profession]
        if profession and profession.spells[recipe.spell] then
          table.insert(knowers, {
            name = character.name,
            skill = profession.skill,
            isSelf = memberNumber == guild.self,
            online = ns.IsOnline(character.name) ~= nil,
          })
          break
        end
      end
    end
  end
  -- Own characters first, then who is online, then the most skilled.
  table.sort(knowers, function(a, b)
    if a.isSelf ~= b.isSelf then
      return a.isSelf
    end
    if a.online ~= b.online then
      return a.online
    end
    return (a.skill or 0) > (b.skill or 0)
  end)
  return knowers
end

function ns.CraftersOf(itemId)
  if not byMadeItem then
    BuildItemIndex()
  end
  return Knowers(byMadeItem[itemId])
end

-- Returns the knowers and whether the item teaches a recipe at all.
function ns.KnowersOfRecipeItem(itemId)
  if not byRecipeItem then
    BuildItemIndex()
  end
  local recipes = byRecipeItem[itemId]
  return Knowers(recipes), recipes ~= nil
end

local function ReagentCount(request, itemId)
  local recipe = ns.RecipeData(request.profession, request.spell)
  for _, reagent in ipairs(recipe and recipe.reagents or {}) do
    if reagent.itemId == itemId then
      return reagent.count * (request.quantity or 1)
    end
  end
  return 0
end

-- How many requests need the item, and how much of it the own accepted ones need.
function ns.ReagentDemand(itemId)
  local guild = GuildHubDB.guild
  local demand = { requests = 0, ownRequests = 0, ownCount = 0 }
  if not guild then
    return demand
  end
  for _, request in ipairs(guild.requests) do
    local count = ReagentCount(request, itemId)
    if count > 0 then
      demand.requests = demand.requests + 1
      if request.status == "accepted" and request.crafter == guild.self then
        demand.ownRequests = demand.ownRequests + 1
        demand.ownCount = demand.ownCount + count
      end
    end
  end
  return demand
end
