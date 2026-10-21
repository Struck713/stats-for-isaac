local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")
local Rooms = require("statsforisaac.rooms")

local Combat = {}

function Combat.onPlayerDamage(_, entity, amount, flags, source, countdown)
  if not State.active() then
    return
  end
  local player = entity:ToPlayer()
  local visit = Rooms.current()
  if not player or not visit then
    return
  end
  local hit = {
    amount = amount,
    flags = flags,
    sourceType = source.Type,
    sourceTypeName = Util.enumName(EntityType, source.Type),
    sourceVariant = source.Variant,
    frame = State.clock(),
    player = Util.playerIndex(player),
  }
  if source.Entity then
    hit.sourceSubtype = source.Entity.SubType
  end
  table.insert(visit.damage, hit)
  -- Kept on the run so the cause of death is known when the game ends, even after a continue.
  State.run.lastHit = {
    hit = hit,
    floor = State.floor and State.floor.index,
    roomType = visit.typeName,
    gridIndex = visit.gridIndex,
  }
end

function Combat.onEntityKill(_, entity)
  if not State.active() or not entity:IsActiveEnemy(true) then
    return
  end
  local visit = Rooms.current()
  if not visit then
    return
  end
  table.insert(visit.kills, {
    type = entity.Type,
    typeName = Util.enumName(EntityType, entity.Type),
    variant = entity.Variant,
    subtype = entity.SubType,
    isBoss = entity:IsBoss(),
    frame = State.clock(),
  })
end

return Combat
