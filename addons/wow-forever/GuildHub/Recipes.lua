local _, ns = ...

-- Named access to the recipe table of Data.lua, which stores each recipe compactly as
-- { made item or false, { recipe items }, { reagent item, count, … } }.

local function Unpack(data)
  local reagents = {}
  for i = 1, #data[3], 2 do
    table.insert(reagents, { itemId = data[3][i], count = data[3][i + 1] })
  end
  return { made = data[1] or nil, recipeItems = data[2], reagents = reagents }
end

-- The recipe of a profession's spell, or nil when the pack does not know it.
function ns.RecipeData(profession, spell)
  local spells = profession and ns.recipes[profession]
  local data = spells and spell and spells[spell]
  return data and Unpack(data) or nil
end

-- Calls fn(profession, spell, recipe) for every recipe of the pack.
function ns.EachRecipe(fn)
  for profession, spells in pairs(ns.recipes) do
    for spell, data in pairs(spells) do
      fn(profession, spell, Unpack(data))
    end
  end
end
