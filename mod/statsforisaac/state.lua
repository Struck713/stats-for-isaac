-- Shared in-memory state for the tracker, plus loading/saving the JSON save file.
local json = require("json")
local Util = require("statsforisaac.util")

local SCHEMA_VERSION = 4

local State = {
  mod = nil,
  data = nil,         -- the decoded save file { schemaVersion, currentRun, runCount }, plus `runs`:
                      -- finished runs waiting to upload, which are kept in memory only
  run = nil,          -- the Run currently being recorded
  floor = nil,        -- the Floor currently being recorded
  room = nil,         -- the RoomVisit currently being recorded
  pendingRoom = false, -- MC_POST_NEW_ROOM fired but the visit hasn't been opened yet (see rooms.lua)
  ready = false,      -- true once MC_POST_GAME_STARTED has set everything up
}

function State.init(mod)
  State.mod = mod
end

function State.load()
  local data
  if State.mod:HasData() then
    local raw = State.mod:LoadData()
    local ok, decoded = pcall(json.decode, raw)
    local valid = ok and type(decoded) == "table"
      and ((decoded.schemaVersion or 0) >= 4 or type(decoded.runs) == "table")
    if valid then
      data = decoded
    elseif raw ~= "" then
      -- Never silently throw away a file we couldn't read; keep it around so it can be recovered by hand.
      Isaac.DebugString("[Stats for Isaac] Could not decode save data, starting fresh and keeping the raw text")
      data = { recoveredRaw = raw }
    end
  end
  data = data or {}
  data.runs = data.runs or {}
  if (data.schemaVersion or 1) < 2 then
    -- Version 1 kept the run in progress inside `runs` and pointed at it with `currentRunId`.
    for i = #data.runs, 1, -1 do
      if data.runs[i].id == data.currentRunId and data.runs[i].status == "in_progress" then
        data.currentRun = table.remove(data.runs, i)
      end
    end
    data.currentRunId = nil
  end
  if (data.schemaVersion or 1) < 4 then
    -- Before version 4 every finished run was kept in the file. Those not uploaded yet get one more
    -- try this session; the next save drops them from the file either way.
    data.runCount = data.runCount or #data.runs
    local pending = {}
    for _, run in ipairs(data.runs) do
      if not run.uploaded then
        -- Version 3 gave every run a `uid` for uploading.
        run.uid = run.uid or Util.newUid()
        pending[#pending + 1] = run
      end
    end
    data.runs = pending
  end
  if data.currentRun then
    data.currentRun.uid = data.currentRun.uid or Util.newUid()
  end
  data.schemaVersion = SCHEMA_VERSION
  State.data = data
end

-- Writes the save file. This is only done when a run ends or when the player saves and quits,
-- never while a floor is being played, so the file can't be read to look ahead. When an
-- unfinished run is written, the map of the floor it's on is left out for the same reason; it's
-- re-taken from the game on continue. Finished runs are never written: they reach the website or
-- are lost, which keeps this small and fast however many runs have been played.
function State.persist()
  if not State.data then
    return
  end
  local floors = State.data.currentRun and State.data.currentRun.floors
  local openFloor = floors and floors[#floors]
  if openFloor and openFloor.exitFrame then
    openFloor = nil
  end
  local map = openFloor and openFloor.map
  if openFloor then
    openFloor.map = {}
  end
  local runs = State.data.runs
  State.data.runs = nil
  local ok, encoded = pcall(json.encode, State.data)
  State.data.runs = runs
  if openFloor then
    openFloor.map = map
  end
  if ok then
    State.mod:SaveData(encoded)
  else
    Isaac.DebugString("[Stats for Isaac] Failed to encode save data: " .. tostring(encoded))
  end
end

-- Drops everything held in memory. Called when leaving a game so that switching save slots
-- can't write one slot's runs into another slot's file.
function State.clear()
  State.data = nil
  State.run = nil
  State.floor = nil
  State.room = nil
  State.pendingRoom = false
  State.ready = false
end

-- Game update frames (30 per second) elapsed in the current run. Kept on the run itself so it
-- survives quitting and continuing, and so paused time is never counted.
function State.clock()
  return State.run and State.run.totalFrames or 0
end

function State.active()
  return State.ready and State.run ~= nil
end

return State
