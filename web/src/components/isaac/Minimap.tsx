// The floor's layout drawn like the in-game minimap: explored rooms inked in, rooms the player
// never entered left as faint outlines, and icons for special rooms.
import { ROOM_SHAPE_CELLS, isSpriteName, roomTypeName } from "@/lib/game";
import type { MapRoom } from "@/lib/runSchema";
import { Sprite } from "./Sprite";

const GRID_WIDTH = 13;
const CELL = 24;

interface Cell {
  x: number;
  y: number;
  room: MapRoom;
  key: string;
}

export function Minimap({ map }: { map: MapRoom[] }) {
  const cells: Cell[] = [];
  for (const room of map) {
    if (room.gridIndex < 0) continue;
    const ox = room.gridIndex % GRID_WIDTH;
    const oy = Math.floor(room.gridIndex / GRID_WIDTH);
    for (const [dx, dy] of ROOM_SHAPE_CELLS[room.shape ?? 1] ?? ROOM_SHAPE_CELLS[1]) {
      cells.push({ x: ox + dx, y: oy + dy, room, key: `${room.listIndex}:${dx}:${dy}` });
    }
  }
  if (cells.length === 0) {
    return <p className="text-ink-soft italic">No map recorded for this floor.</p>;
  }
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const width = Math.max(...cells.map((c) => c.x)) - minX + 1;
  const height = Math.max(...cells.map((c) => c.y)) - minY + 1;
  const owner = new Map(cells.map((c) => [`${c.x},${c.y}`, c.room.listIndex]));
  const sameRoom = (c: Cell, dx: number, dy: number) => owner.get(`${c.x + dx},${c.y + dy}`) === c.room.listIndex;

  return (
    <div
      className="relative shrink-0"
      style={{ width: width * CELL, height: height * CELL }}
      role="img"
      aria-label={`Floor map: ${map.filter((r) => r.visitedCount > 0).length} of ${map.length} rooms explored`}
    >
      {cells.map((c) => {
        const visited = c.room.visitedCount > 0;
        const border = visited ? "3px solid var(--ink)" : "2px dashed rgb(42 28 19 / 0.35)";
        // Icons go in the cell the game treats as the room's main position.
        const isMainCell = c.y * GRID_WIDTH + c.x === c.room.safeGridIndex;
        // Special rooms have a sprite named after their RoomType (see gen-wiki.ts).
        const icon = `room${c.room.type}`;
        return (
          <div
            key={c.key}
            title={`${roomTypeName(c.room.typeName)}${visited ? "" : " (not entered)"}`}
            className="absolute flex items-center justify-center"
            style={{
              left: (c.x - minX) * CELL,
              top: (c.y - minY) * CELL,
              width: CELL,
              height: CELL,
              background: visited ? "#f4ead2" : "transparent",
              borderTop: sameRoom(c, 0, -1) ? "none" : border,
              borderBottom: sameRoom(c, 0, 1) ? "none" : border,
              borderLeft: sameRoom(c, -1, 0) ? "none" : border,
              borderRight: sameRoom(c, 1, 0) ? "none" : border,
              opacity: visited ? 1 : 0.7,
            }}
          >
            {isMainCell && isSpriteName(icon) && <Sprite name={icon} />}
          </div>
        );
      })}
    </div>
  );
}
