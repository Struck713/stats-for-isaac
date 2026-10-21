local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")
local Floors = require("statsforisaac.floors")

local Rooms = {}

local game = Game()

local lastClear = false

function Rooms.enter(resumed)
  if not State.floor then
    return
  end
  State.pendingRoom = false
  local level = game:GetLevel()
  local room = game:GetRoom()
  local desc = level:GetCurrentRoomDesc()
  local data = desc.Data
  local roomType = room:GetType()
  local visit = {
    gridIndex = desc.GridIndex,
    safeGridIndex = desc.SafeGridIndex,
    listIndex = desc.ListIndex,
    type = roomType,
    typeName = Util.enumName(RoomType, roomType),
    shape = room:GetRoomShape(),
    variant = data and data.Variant,
    name = data and data.Name,
    firstVisit = room:IsFirstVisit(),
    wasClearOnEnter = room:IsClear(),
    enterFrame = State.clock(),
    pickups = {},
    resources = {},
    items = {},
    used = {},
    damage = {},
    kills = {},
  }
  if resumed then
    visit.resumed = true
  end
  local bossId = room:GetBossID()
  if bossId ~= 0 then
    visit.bossId = bossId
  end
  table.insert(State.floor.rooms, visit)
  State.room = visit
  lastClear = visit.wasClearOnEnter
  Floors.snapshotMap()
end

function Rooms.finalize(visit, clock)
  visit.exitFrame = clock
  visit.durationFrames = clock - visit.enterFrame
end

function Rooms.close()
  if State.room and not State.room.exitFrame then
    Rooms.finalize(State.room, State.clock())
  end
  State.room = nil
end

-- MC_POST_NEW_ROOM fires before MC_POST_NEW_LEVEL, so opening the visit is deferred until either
-- the floor has been switched or the next update, whichever comes first.
function Rooms.processPending()
  if State.pendingRoom then
    Rooms.enter()
  end
end

-- The visit events should be attributed to right now (opening a pending visit if needed).
function Rooms.current()
  Rooms.processPending()
  return State.room
end

-- Records the frame a room goes from uncleared to cleared. Rooms that start clear and then lock
-- (challenge rooms, ambushes) are caught too since this looks for the transition.
function Rooms.checkClear()
  local visit = State.room
  if not visit then
    return
  end
  local clear = game:GetRoom():IsClear()
  if clear and not lastClear and not visit.clearedAtFrame then
    visit.clearedAtFrame = State.clock()
    visit.clearFrames = visit.clearedAtFrame - visit.enterFrame
    Floors.snapshotMap()
  end
  lastClear = clear
end

return Rooms
