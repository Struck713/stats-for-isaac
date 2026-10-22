local mod = RegisterMod("Stats for Isaac", 1)

local State = require("statsforisaac.state")
local Floors = require("statsforisaac.floors")
local Rooms = require("statsforisaac.rooms")
local Pickups = require("statsforisaac.pickups")
local Items = require("statsforisaac.items")
local Combat = require("statsforisaac.combat")
local Run = require("statsforisaac.run")
local Upload = require("statsforisaac.upload")

local game = Game()

State.init(mod)
Upload.init()

-- MC_POST_NEW_ROOM and MC_POST_NEW_LEVEL also fire while a game is being set up, before
-- MC_POST_GAME_STARTED. Those are ignored here; MC_POST_GAME_STARTED handles the first room itself.
local function isTracking()
  return State.active() and game:GetFrameCount() > 0
end

function mod:onGameStarted(isContinued)
  local runEnded = false
  -- Restarting (holding R) doesn't leave the game, so the previous run may still be in memory.
  if State.run then
    Run.closeOut(State.run, "abandoned", false)
    runEnded = true
  end
  if not State.data then
    State.load()
  end
  Pickups.reset()
  Items.reset()

  local resumed = isContinued and Run.resume()
  if not resumed then
    runEnded = Run.abandonStale() or runEnded
    Run.start(isContinued)
  end
  if not (resumed and Floors.resume()) then
    Floors.open()
  end
  Rooms.enter(resumed)
  State.ready = true
  local startTime = Isaac.GetTime()
  if runEnded then
    State.persist()
  end
  -- Also sends anything still waiting: a failed upload, or runs from an older save file.
  Upload.sync()
  Isaac.DebugString("[Stats for Isaac] game start: save and upload took " .. (Isaac.GetTime() - startTime) .. "ms")
end

function mod:onPlayerInit()
  -- A fresh game is being set up; stop tracking until MC_POST_GAME_STARTED.
  if game:GetFrameCount() == 0 then
    State.ready = false
  end
end

function mod:onGameEnd(isGameOver)
  if State.run then
    Run.closeOut(State.run, isGameOver and "died" or "won", true)
    State.persist()
    Upload.sync()
  end
  State.ready = false
end

function mod:onGameExit(shouldSave)
  if State.run then
    if shouldSave then
      Rooms.close()
    else
      Run.closeOut(State.run, "abandoned", true)
    end
  end
  if State.data then
    -- Finished runs are never saved, so this is their last chance to reach the website.
    Upload.flush()
    State.persist()
  end
  State.clear()
end

function mod:onNewRoom()
  if not isTracking() then
    return
  end
  Rooms.close()
  State.pendingRoom = true
end

function mod:onNewLevel()
  if not isTracking() then
    return
  end
  Floors.close()
  Floors.open()
  Rooms.processPending()
end

function mod:onUpdate()
  if not State.active() then
    return
  end
  State.run.totalFrames = State.run.totalFrames + 1
  Rooms.processPending()
  Rooms.checkClear()
  Pickups.prune()
end

function mod:onPeffectUpdate(player)
  Pickups.onPeffectUpdate(nil, player)
  Items.onPeffectUpdate(nil, player)
end

function mod:onRender()
  Upload.tick()
end

-- Debug console: "sfi dump" prints the current floor's summary; "sfi token/upload/status"
-- manage uploads.
function mod:onCommand(cmd, params)
  if cmd ~= "sfi" then
    return
  end
  local uploadReply = Upload.command(params)
  if uploadReply then
    return uploadReply
  end
  if not State.active() then
    return "Stats for Isaac: no run is being tracked"
  end
  if params == "dump" then
    local floor = State.floor
    if not floor then
      return "Stats for Isaac: no floor open"
    end
    local s = Floors.summarize(floor)
    local lines = {
      "Run " .. State.run.id .. ", floor " .. floor.index .. " (" .. floor.name .. ")",
      "Frames on floor: " .. (State.clock() - floor.enterFrame),
      "Rooms explored: " .. s.roomsExplored .. "/" .. s.roomsInLayout .. ", visits: " .. s.roomVisits,
      "Items: " .. s.items .. ", uses: " .. s.used .. ", hits: " .. s.hits .. ", kills: " .. s.kills,
    }
    for name, count in pairs(s.pickups) do
      lines[#lines + 1] = "  " .. name .. ": " .. count
    end
    return table.concat(lines, "\n")
  end
  return "Usage: sfi dump | sfi token <token> | sfi upload | sfi status"
end

mod:AddCallback(ModCallbacks.MC_POST_GAME_STARTED, mod.onGameStarted)
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_INIT, mod.onPlayerInit)
mod:AddCallback(ModCallbacks.MC_POST_GAME_END, mod.onGameEnd)
mod:AddCallback(ModCallbacks.MC_PRE_GAME_EXIT, mod.onGameExit)
mod:AddCallback(ModCallbacks.MC_POST_NEW_ROOM, mod.onNewRoom)
mod:AddCallback(ModCallbacks.MC_POST_NEW_LEVEL, mod.onNewLevel)
mod:AddCallback(ModCallbacks.MC_POST_UPDATE, mod.onUpdate)
mod:AddCallback(ModCallbacks.MC_POST_RENDER, mod.onRender)
mod:AddCallback(ModCallbacks.MC_EXECUTE_CMD, mod.onCommand)
mod:AddCallback(ModCallbacks.MC_POST_PEFFECT_UPDATE, mod.onPeffectUpdate)
mod:AddCallback(ModCallbacks.MC_PRE_PICKUP_COLLISION, Pickups.onCollision)
mod:AddCallback(ModCallbacks.MC_POST_PICKUP_UPDATE, Pickups.onPickupUpdate)
mod:AddCallback(ModCallbacks.MC_POST_ENTITY_REMOVE, Pickups.onEntityRemove)
mod:AddCallback(ModCallbacks.MC_USE_CARD, Items.onUseCard)
mod:AddCallback(ModCallbacks.MC_USE_PILL, Items.onUsePill)
mod:AddCallback(ModCallbacks.MC_USE_ITEM, Items.onUseItem)
mod:AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, Combat.onPlayerDamage, EntityType.ENTITY_PLAYER)
mod:AddCallback(ModCallbacks.MC_POST_ENTITY_KILL, Combat.onEntityKill)
