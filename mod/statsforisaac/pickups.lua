local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")
local Rooms = require("statsforisaac.rooms")

local Pickups = {}

-- How long (in frames) a touched pickup may take to be confirmed as collected before we assume the
-- player couldn't take it (e.g. a red heart at full health, or a shop item they can't afford).
local PENDING_TTL = 10
-- How long a touched collectible/trinket stays eligible to supply the price of a queued item.
local TOUCH_TTL = 30

local pending = {}      -- [ptrHash] = { variant, subtype, price, player, frame }
local lastTouched = {}  -- [playerIndex] = { variant, subtype, price, frame } for collectibles/trinkets
local inventory = {}    -- [playerIndex] = { [resource] = last seen value }

function Pickups.reset()
  pending = {}
  lastTouched = {}
  inventory = {}
end

-- Returns and forgets the price of a collectible/trinket the player touched recently, so the item
-- tracker can tell shop purchases and devil deals apart from free items.
function Pickups.takeTouchedPrice(playerIndex, variant, subtype)
  local touched = lastTouched[playerIndex]
  if touched and touched.variant == variant and touched.subtype == subtype
      and State.clock() - touched.frame <= TOUCH_TTL then
    lastTouched[playerIndex] = nil
    return touched.price
  end
  return 0
end

function Pickups.onCollision(_, pickup, collider)
  if not State.active() then
    return
  end
  local player = collider:ToPlayer()
  if not player then
    return
  end
  local index = Util.playerIndex(player)
  local variant = pickup.Variant
  -- Collectibles and trinkets are recorded through the player's item queue (items.lua); here we
  -- only remember what they cost.
  if variant == PickupVariant.PICKUP_COLLECTIBLE or variant == PickupVariant.PICKUP_TRINKET then
    lastTouched[index] = { variant = variant, subtype = pickup.SubType, price = pickup.Price, frame = State.clock() }
    return
  end
  pending[GetPtrHash(pickup)] = {
    variant = variant,
    subtype = pickup.SubType,
    price = pickup.Price,
    player = index,
    frame = State.clock(),
  }
end

local function confirm(hash)
  local p = pending[hash]
  pending[hash] = nil
  if State.clock() - p.frame > PENDING_TTL then
    return
  end
  local visit = Rooms.current()
  if not visit then
    return
  end
  local entry = {
    variant = p.variant,
    variantName = Util.enumName(PickupVariant, p.variant),
    subtype = p.subtype,
    frame = State.clock(),
    player = p.player,
  }
  if p.price ~= 0 then
    entry.price = p.price
  end
  table.insert(visit.pickups, entry)
end

function Pickups.onPickupUpdate(_, pickup)
  if not State.active() then
    return
  end
  local hash = GetPtrHash(pickup)
  if pending[hash] and pickup:GetSprite():IsPlaying("Collect") then
    confirm(hash)
  end
end

function Pickups.onEntityRemove(_, entity)
  if not State.active() or entity.Type ~= EntityType.ENTITY_PICKUP then
    return
  end
  local hash = GetPtrHash(entity)
  if pending[hash] then
    confirm(hash)
  end
end

function Pickups.prune()
  local now = State.clock()
  for hash, p in pairs(pending) do
    if now - p.frame > PENDING_TTL then
      pending[hash] = nil
    end
  end
end

-- Diffs each player's coins/bombs/keys/hearts every frame and books the change against the current
-- room. This catches gains that don't come from a pickup entity, and any spending.
function Pickups.onPeffectUpdate(_, player)
  if not State.active() then
    return
  end
  local index = Util.playerIndex(player)
  local last = inventory[index]
  local current = {}
  for name, get in pairs(Util.RESOURCES) do
    current[name] = get(player)
  end
  inventory[index] = current
  if not last then
    return
  end
  local visit
  for name, value in pairs(current) do
    local delta = value - last[name]
    if delta ~= 0 then
      visit = visit or Rooms.current()
      if not visit then
        return
      end
      local totals = visit.resources[name] or { gained = 0, spent = 0 }
      if delta > 0 then
        totals.gained = totals.gained + delta
      else
        totals.spent = totals.spent - delta
      end
      visit.resources[name] = totals
    end
  end
end

return Pickups
