local Util = {}

local game = Game()

function Util.round(x, places)
  local m = 10 ^ (places or 2)
  return math.floor(x * m + 0.5) / m
end

function Util.forEachPlayer(fn)
  for i = 0, game:GetNumPlayers() - 1 do
    local player = Isaac.GetPlayer(i)
    if player then
      fn(player, i)
    end
  end
end

function Util.playerIndex(player)
  local hash = GetPtrHash(player)
  for i = 0, game:GetNumPlayers() - 1 do
    local other = Isaac.GetPlayer(i)
    if other and GetPtrHash(other) == hash then
      return i
    end
  end
  return -1
end

-- Reverse lookup of an enum table (e.g. RoomType, PickupVariant) so the JSON is readable without
-- the viewer needing its own copy of every enum.
local reversed = {}
function Util.enumName(enum, value)
  local lookup = reversed[enum]
  if not lookup then
    lookup = {}
    for name, v in pairs(enum) do
      lookup[v] = name
    end
    reversed[enum] = lookup
  end
  return lookup[value]
end

-- Every resource tracked for inventory deltas, in half-heart units for health.
Util.RESOURCES = {
  coins = function(p) return p:GetNumCoins() end,
  bombs = function(p) return p:GetNumBombs() end,
  gigaBombs = function(p) return p:GetNumGigaBombs() end,
  keys = function(p) return p:GetNumKeys() end,
  hearts = function(p) return p:GetHearts() end,
  maxHearts = function(p) return p:GetMaxHearts() end,
  soulHearts = function(p) return p:GetSoulHearts() end,
  blackHearts = function(p) return p:GetBlackHearts() end,
  boneHearts = function(p) return p:GetBoneHearts() end,
  eternalHearts = function(p) return p:GetEternalHearts() end,
  goldenHearts = function(p) return p:GetGoldenHearts() end,
  rottenHearts = function(p) return p:GetRottenHearts() end,
  brokenHearts = function(p) return p:GetBrokenHearts() end,
}

function Util.playerSnapshot(player, index)
  local snap = {
    player = index,
    type = player:GetPlayerType(),
    name = player:GetName(),
    damage = Util.round(player.Damage),
    maxFireDelay = Util.round(player.MaxFireDelay),
    tearRange = Util.round(player.TearRange),
    shotSpeed = Util.round(player.ShotSpeed),
    moveSpeed = Util.round(player.MoveSpeed),
    luck = Util.round(player.Luck),
    collectibleCount = player:GetCollectibleCount(),
  }
  for name, get in pairs(Util.RESOURCES) do
    snap[name] = get(player)
  end
  return snap
end

function Util.snapshotAllPlayers()
  local snaps = {}
  Util.forEachPlayer(function(player, i)
    snaps[#snaps + 1] = Util.playerSnapshot(player, i)
  end)
  return snaps
end

-- Unix time in seconds. `os` only exists with --luadebug, so this is nil without it.
function Util.now()
  return os and os.time and os.time() or nil
end

-- Random id that identifies a run across uploads. "<seed>#<number>" isn't unique across save
-- slots, so the server de-duplicates on this instead.
function Util.newUid()
  local parts = {}
  for i = 1, 4 do
    parts[i] = string.format("%04x", Random() % 0x10000)
  end
  return table.concat(parts)
end

return Util
