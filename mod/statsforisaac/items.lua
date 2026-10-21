local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")
local Rooms = require("statsforisaac.rooms")
local Pickups = require("statsforisaac.pickups")

local Items = {}

local lastQueued = {} -- [playerIndex] = "c<id>" / "t<id>" while an item is held up over the head

function Items.reset()
  lastQueued = {}
end

-- Collectibles and trinkets a run starts with (character items, Eden's random items, etc.).
function Items.startingInventory()
  local config = Isaac.GetItemConfig()
  local count = config:GetCollectibles().Size
  local items = {}
  Util.forEachPlayer(function(player, index)
    for id = 1, count - 1 do
      local item = config:GetCollectible(id)
      if item then
        local num = player:GetCollectibleNum(id, true)
        if num > 0 then
          items[#items + 1] = { kind = "collectible", id = id, name = item.Name, count = num, player = index }
        end
      end
    end
    for slot = 0, player:GetMaxTrinkets() - 1 do
      local id = player:GetTrinket(slot)
      if id ~= 0 then
        local item = config:GetTrinket(id)
        items[#items + 1] = { kind = "trinket", id = id, name = item and item.Name, player = index }
      end
    end
  end)
  return items
end

-- An item being picked up is held over the player's head (QueuedItem) before it is added, which is
-- the only pickup signal the vanilla API gives for collectibles and trinkets.
function Items.onPeffectUpdate(_, player)
  if not State.active() then
    return
  end
  local index = Util.playerIndex(player)
  local item = player.QueuedItem.Item
  if not item then
    lastQueued[index] = nil
    return
  end
  local isTrinket = item:IsTrinket()
  local key = (isTrinket and "t" or "c") .. item.ID
  if lastQueued[index] == key then
    return
  end
  lastQueued[index] = key
  local visit = Rooms.current()
  if not visit then
    return
  end
  local variant = isTrinket and PickupVariant.PICKUP_TRINKET or PickupVariant.PICKUP_COLLECTIBLE
  local entry = {
    kind = isTrinket and "trinket" or "collectible",
    id = item.ID,
    name = item.Name,
    frame = State.clock(),
    player = index,
  }
  local price = Pickups.takeTouchedPrice(index, variant, item.ID)
  if price ~= 0 then
    entry.price = price
  end
  table.insert(visit.items, entry)
end

local function recordUse(kind, id, player, useFlags)
  if not State.active() or not player then
    return
  end
  local visit = Rooms.current()
  if not visit then
    return
  end
  table.insert(visit.used, {
    kind = kind,
    id = id,
    flags = useFlags,
    frame = State.clock(),
    player = Util.playerIndex(player),
  })
end

function Items.onUseCard(_, card, player, useFlags)
  recordUse("card", card, player, useFlags)
end

function Items.onUsePill(_, pillEffect, player, useFlags)
  recordUse("pill", pillEffect, player, useFlags)
end

function Items.onUseItem(_, collectible, rng, player, useFlags)
  recordUse("active", collectible, player, useFlags)
end

return Items
