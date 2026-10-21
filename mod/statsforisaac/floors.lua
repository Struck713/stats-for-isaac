local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")

local Floors = {}

local game = Game()

function Floors.open()
  local level = game:GetLevel()
  local floor = {
    index = #State.run.floors + 1,
    stage = level:GetStage(),
    stageType = level:GetStageType(),
    absoluteStage = level:GetAbsoluteStage(),
    name = level:GetName(),
    curses = level:GetCurses(),
    curseName = level:GetCurseName(),
    enterFrame = State.clock(),
    statsOnEnter = Util.snapshotAllPlayers(),
    map = {},
    rooms = {},
  }
  table.insert(State.run.floors, floor)
  State.floor = floor
end

-- On continue, picks the run's last floor back up if the game is still on that floor.
function Floors.resume()
  local floor = State.run.floors[#State.run.floors]
  if not floor or floor.exitFrame then
    return false
  end
  local level = game:GetLevel()
  if floor.stage ~= level:GetStage() or floor.stageType ~= level:GetStageType() then
    Floors.finalize(floor, State.clock(), nil)
    return false
  end
  State.floor = floor
  return true
end

-- Records the level's room layout and exploration state. MC_POST_NEW_LEVEL fires after the level
-- has already changed, so this is refreshed whenever the player enters or clears a room rather than
-- being taken once when the floor ends.
function Floors.snapshotMap()
  if not State.floor then
    return
  end
  local rooms = game:GetLevel():GetRooms()
  local map = {}
  for i = 0, #rooms - 1 do
    local desc = rooms:Get(i)
    local data = desc.Data
    map[#map + 1] = {
      gridIndex = desc.GridIndex,
      safeGridIndex = desc.SafeGridIndex,
      listIndex = desc.ListIndex,
      shape = data and data.Shape,
      type = data and data.Type,
      typeName = data and Util.enumName(RoomType, data.Type),
      variant = data and data.Variant,
      name = data and data.Name,
      visitedCount = desc.VisitedCount,
      clear = desc.Clear,
      displayFlags = desc.DisplayFlags,
    }
  end
  State.floor.map = map
end

local function addResource(totals, name, delta)
  local t = totals[name] or { gained = 0, spent = 0 }
  t.gained = t.gained + delta.gained
  t.spent = t.spent + delta.spent
  totals[name] = t
end

function Floors.summarize(floor)
  local s = {
    roomsInLayout = #floor.map,
    roomsExplored = 0,
    roomsCleared = 0,
    roomVisits = #floor.rooms,
    pickups = {},
    resources = {},
    items = 0,
    used = 0,
    hits = 0,
    damageTaken = 0,
    kills = 0,
    bossKills = 0,
  }
  for _, r in ipairs(floor.map) do
    if r.visitedCount > 0 then
      s.roomsExplored = s.roomsExplored + 1
    end
    if r.clear then
      s.roomsCleared = s.roomsCleared + 1
    end
  end
  for _, visit in ipairs(floor.rooms) do
    for _, p in ipairs(visit.pickups) do
      local key = p.variantName or tostring(p.variant)
      s.pickups[key] = (s.pickups[key] or 0) + 1
    end
    for name, delta in pairs(visit.resources) do
      addResource(s.resources, name, delta)
    end
    s.items = s.items + #visit.items
    s.used = s.used + #visit.used
    s.hits = s.hits + #visit.damage
    for _, hit in ipairs(visit.damage) do
      s.damageTaken = s.damageTaken + hit.amount
    end
    s.kills = s.kills + #visit.kills
    for _, kill in ipairs(visit.kills) do
      if kill.isBoss then
        s.bossKills = s.bossKills + 1
      end
    end
  end
  if floor.durationFrames then
    s.durationSeconds = Util.round(floor.durationFrames / 30, 1)
  end
  return s
end

-- Closes a floor. `exitStats` is nil when the players in the game no longer belong to this floor
-- (e.g. when closing out a stale run).
function Floors.finalize(floor, clock, exitStats)
  floor.exitFrame = clock
  floor.durationFrames = clock - floor.enterFrame
  floor.statsOnExit = exitStats
  floor.summary = Floors.summarize(floor)
end

function Floors.close()
  if State.floor and not State.floor.exitFrame then
    Floors.finalize(State.floor, State.clock(), Util.snapshotAllPlayers())
  end
  State.floor = nil
end

return Floors
