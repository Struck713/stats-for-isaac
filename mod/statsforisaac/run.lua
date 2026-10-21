local State = require("statsforisaac.state")
local Util = require("statsforisaac.util")
local Floors = require("statsforisaac.floors")
local Rooms = require("statsforisaac.rooms")
local Items = require("statsforisaac.items")

local Run = {}

local game = Game()

function Run.start(isPartial)
  local seeds = game:GetSeeds()
  local player = Isaac.GetPlayer(0)
  local number = #State.data.runs + 1
  local run = {
    id = seeds:GetStartSeedString() .. "#" .. number,
    number = number,
    seed = seeds:GetStartSeedString(),
    character = player:GetPlayerType(),
    characterName = player:GetName(),
    difficulty = game.Difficulty,
    challenge = game.Challenge,
    greedMode = game:IsGreedMode(),
    status = "in_progress",
    totalFrames = 0,
    startingItems = Items.startingInventory(),
    floors = {},
    uid = Util.newUid(),
    startedAt = Util.now(),
  }
  if isPartial then
    -- Continued a run the mod never saw start (mod installed mid-run, or save data was lost).
    run.partial = true
  end
  State.data.currentRun = run
  State.run = run
end

function Run.resume()
  local run = State.data.currentRun
  if run and run.status == "in_progress" then
    State.run = run
    return true
  end
  return false
end

-- Ends a run: closes its last room and floor, sets its final status and moves it into `runs`.
-- `live` is true when the run is the one being played right now, so final player stats can be
-- read from the game.
function Run.closeOut(run, status, live)
  local clock = run.totalFrames
  local floor = run.floors[#run.floors]
  if floor and not floor.exitFrame then
    local visit = floor.rooms[#floor.rooms]
    if visit and not visit.exitFrame then
      Rooms.finalize(visit, clock)
    end
    Floors.finalize(floor, clock, live and Util.snapshotAllPlayers() or nil)
  end
  run.status = status
  run.endedAt = Util.now()
  run.endedOnFloor = floor and floor.index
  if status == "died" then
    run.deathCause = run.lastHit
  end
  run.lastHit = nil
  table.insert(State.data.runs, run)
  if State.data.currentRun == run then
    State.data.currentRun = nil
  end
  if State.run == run then
    State.run = nil
    State.floor = nil
    State.room = nil
    State.pendingRoom = false
  end
end

-- A new game was started while the save file still has a run in progress. Returns true if one
-- was closed out.
function Run.abandonStale()
  local run = State.data.currentRun
  State.data.currentRun = nil
  if run and run.status == "in_progress" then
    Run.closeOut(run, "abandoned", false)
    return true
  end
  return false
end

return Run
