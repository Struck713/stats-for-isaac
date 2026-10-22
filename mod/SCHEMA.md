# Stats for Isaac: save file schema

The mod writes a single JSON document with `mod:SaveData()`. Each game save slot has its own file:

```
<Isaac install>\data\statsforisaac\save1.dat   (save2.dat / save3.dat for the other slots)
```

Despite the `.dat` extension the file is plain JSON. Since v4 it only holds the run in progress:
finished runs are uploaded to the website and never written to disk (see [Uploading](#uploading)).
The Run object described below is what's uploaded.

## Conventions

- **Time** is counted in game update frames, at **30 per second**. Paused time isn't counted. Every `*Frame` field is measured from the start of the run (`Run.totalFrames` is the run clock).
- **Optional fields** are left out of the object rather than set to `null`.
- **Empty objects may be encoded as `[]`.** Isaac's `json.lua` can't tell an empty object from an empty array. The viewer should treat `[]` as `{}` for `resources`, `summary.pickups` and `summary.resources`.
- **Enums** are stored as their numeric game values. A `*Name` field next to the number holds the enum key (e.g. `typeName: "ROOM_TREASURE"`), so the viewer doesn't need its own copy of the enums.
- **Players** are identified by `player`, the index passed to `Isaac.GetPlayer(i)`: 0 is the main player, 1+ are co-op players or Esau.
- **Item names** come from the item config. For vanilla items they're often localization keys such as `#SAD_ONION_NAME`. Use `id` as the reliable identifier.
- **Heart values** are in half-hearts.

## Root

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | Currently `4`. |
| `currentRun` | Run? | The unfinished run, only present after the player saved and quit mid-run. The map of the floor it's on is left out (`map` is empty). |
| `runCount` | int? | The last run `number` handed out. |
| `recoveredRaw` | string? | Only present if an older file couldn't be decoded. Holds the original text so it isn't lost. |

## Run

| Field | Type | Notes |
|---|---|---|
| `id` | string | `"<seed>#<number>"`. Not unique across save slots. |
| `uid` | string | 16 random hex characters. Identifies the run for uploading; the site de-duplicates on it. |
| `startedAt` / `endedAt` | int? | Unix time in seconds. Only recorded with `--luadebug` (the game hides `os` otherwise). |
| `number` | int | 1-based run counter, assigned when the run starts. Resets that are dropped (see Caveats) give their number back. |
| `seed` | string | Start seed, e.g. `"ABCD 1234"`. |
| `character` / `characterName` | int / string | `PlayerType` of player 0 at run start. |
| `difficulty` | int | `Difficulty` enum. 0 normal, 1 hard, 2 greed, 3 greedier. |
| `challenge` | int | `Challenge` enum. 0 means no challenge. |
| `greedMode` | bool | |
| `status` | string | `in_progress`, `won`, `died` or `abandoned`. |
| `totalFrames` | int | Run length (in-game time). |
| `partial` | bool? | The mod first saw this run on a *continue*, so its start is missing. |
| `startingItems` | Item[] | Collectibles (with `count`) and trinkets held at run start. |
| `floors` | Floor[] | In the order they were played. |
| `endedOnFloor` | int? | `Floor.index` the run ended on. |
| `deathCause` | LastHit? | Only when `status == "died"`. |
| `lastHit` | LastHit? | Only while a run is in progress. Removed when the run ends. |

**LastHit** = `{ hit: Hit, floor: int, roomType: string, gridIndex: int }`

## Floor

| Field | Type | Notes |
|---|---|---|
| `index` | int | 1-based order within the run. A floor that's re-generated (e.g. Forget Me Now) gets a new entry. |
| `stage`, `stageType`, `absoluteStage` | int | `LevelStage` / `StageType` enums. |
| `name` | string | e.g. `"Basement I"`. |
| `curses` | int | `LevelCurse` bitmask. |
| `curseName` | string | |
| `enterFrame`, `exitFrame`, `durationFrames` | int | `exit*` and `duration*` are absent while the floor is still open. |
| `statsOnEnter` | PlayerSnapshot[] | One per player. |
| `statsOnExit` | PlayerSnapshot[]? | Absent if the floor was closed for an abandoned run. |
| `map` | MapRoom[] | Full layout of the floor's main grid. |
| `rooms` | RoomVisit[] | Every room entry in order. This is the path the player took. |
| `summary` | FloorSummary? | Computed when the floor closes. |

### MapRoom (from `Level:GetRooms()`)

| Field | Notes |
|---|---|
| `gridIndex` | Position on the 13×13 grid: `x = gridIndex % 13`, `y = floor(gridIndex / 13)`. For rooms bigger than 1×1 this is the room's top-left anchor. |
| `safeGridIndex` | The cell the game treats as the room's main position. |
| `listIndex` | Matches `RoomVisit.listIndex`. |
| `shape` | `RoomShape` enum (1x1, 2x2, L-shapes…). Use this to draw multi-cell rooms. |
| `type` / `typeName` | `RoomType` enum. |
| `variant`, `name` | Room layout ID and name from the room config. |
| `visitedCount` | 0 means never entered. **> 0 means explored.** |
| `clear` | Whether the room has been cleared. |
| `displayFlags` | Minimap visibility bitmask: 1 visible, 2 has an icon, 4 fully shown. |

Off-grid rooms (devil/angel rooms, I AM ERROR, crawlspaces, the Black Market, etc.) have negative `gridIndex` values (`GridRooms` enum) and only show up in `rooms`, not `map`.

### RoomVisit

| Field | Notes |
|---|---|
| `gridIndex`, `safeGridIndex`, `listIndex`, `type`, `typeName`, `shape`, `variant`, `name` | The same as MapRoom. |
| `firstVisit` | `Room:IsFirstVisit()` |
| `wasClearOnEnter` | |
| `resumed` | Present (`true`) if this visit started from continuing a saved game. |
| `enterFrame`, `exitFrame`, `durationFrames` | |
| `clearedAtFrame`, `clearFrames` | When the room went from uncleared to cleared, and how long that took after entering. In boss rooms, `clearFrames` is the boss fight duration. |
| `bossId` | Present in boss rooms (`Room:GetBossID()`). |
| `pickups` | Pickup[]: consumable pickup entities the player collected. |
| `resources` | `{ [resource]: { gained, spent } }`: net inventory changes while in this room (see below). |
| `items` | Item[]: collectibles and trinkets picked up. |
| `used` | Use[]: cards, pills and active items used. |
| `damage` | Hit[]: damage taken by players. |
| `kills` | Kill[] |

**Pickup** = `{ variant, variantName, subtype, price?, frame, player }`
- `variant` is a `PickupVariant` (`PICKUP_COIN`, `PICKUP_HEART`, `PICKUP_KEY`, `PICKUP_BOMB`, `PICKUP_TAROTCARD`, `PICKUP_PILL`, `PICKUP_LIL_BATTERY`, …). `subtype` is the matching subtype enum (`CoinSubType`, `HeartSubType`, …).
- `price` appears for shop purchases (> 0 coins) and devil deals (< 0, `PickupPrice` enum).
- Collectibles and trinkets don't appear here; they're in `items`.

**resources** keys: `coins`, `bombs`, `gigaBombs`, `keys`, `hearts`, `maxHearts`, `soulHearts` (includes black), `blackHearts`, `boneHearts`, `eternalHearts`, `goldenHearts`, `rottenHearts`, `brokenHearts`. Each one is the player's inventory diffed every frame. `gained` counts all increases (pickups, item effects, donation payouts, …) and `spent` counts all decreases (shop purchases, bombs placed, keys used, damage taken, …).

**Item** = `{ kind: "collectible" | "trinket", id, name, price?, frame, player }`. Starting items have `count` and no `frame`.

**Use** = `{ kind: "card" | "pill" | "active", id, flags, frame, player }`
- `id` is a `Card`, a `PillEffect` or a `CollectibleType`, depending on `kind`.
- `flags` is a `UseFlag` bitmask. A non-zero value usually means another effect triggered the use rather than the player.

**Hit** = `{ amount, flags, sourceType, sourceTypeName, sourceVariant, sourceSubtype?, frame, player }`
- `amount` is in half-hearts.
- `flags` is a `DamageFlag` bitmask (spikes, explosion, curse room door, …).
- `sourceType` 0 means no entity caused the hit (spikes, curse doors, etc.).

**Kill** = `{ type, typeName, variant, subtype, isBoss, frame }`. `type` is an `EntityType`.

### FloorSummary

`{ roomsInLayout, roomsExplored, roomsCleared, roomVisits, pickups: { [variantName]: count }, resources: { [resource]: { gained, spent } }, items, used, hits, damageTaken, kills, bossKills, durationSeconds }`

### PlayerSnapshot

`{ player, type, name, damage, maxFireDelay, tearRange, shotSpeed, moveSpeed, luck, collectibleCount, coins, bombs, gigaBombs, keys, hearts, maxHearts, soulHearts, blackHearts, boneHearts, eternalHearts, goldenHearts, rottenHearts, brokenHearts }`

Tears per second = `30 / (maxFireDelay + 1)`. `tearRange` is in world units; divide by 40 to get the range stat shown in game.

## Uploading

With `--luadebug`, the mod POSTs finished runs to `https://isaac.nstruck.dev/api/runs` as `{ schemaVersion, runs: Run[] }` (batches of 25) with `Authorization: Bearer <token>`. It does this when a run ends, when a game starts (retrying anything still pending) and, for up to 3 seconds, when exiting to the menu. Runs are encoded one per frame before a batch is sent, so uploading never stalls the game for long. The token is kept in `sfi-config.json` in the mod folder, set with the `sfi token` console command. `sfi status` shows what's pending.

Finished runs wait in memory only. A run the site has answered for (accepted or rejected) is dropped, and anything still waiting when the game exits to the menu is lost. Without `--luadebug` or a token, runs are tracked but never kept. When a pre-v4 save file is loaded, its runs that weren't uploaded yet get one more try that session; the file is then rewritten without them.

## When the file is written

Only when a run ends (death, ending, restart, starting a new run over an unfinished one, or exiting without saving) and when the player saves and quits. It's small, so writing it is quick. It's never written during a floor, so it can't be used to look ahead at the current floor's layout. `sfi dump` in the debug console prints the current floor's summary.

## Caveats

- The vanilla API has no "pickup collected" event. A pickup is counted when a player touches it and, within 10 frames, it plays its `Collect` animation or is removed. `resources` is the authoritative record of inventory changes.
- If a run is restarted (holding R) or a new run is started over an unfinished one, the old run is marked `abandoned` and keeps everything recorded so far. An abandoned run that never left the starting room of floor 1 is dropped instead (unless it's `partial`). A game crash loses everything recorded since the run started or was last continued.
