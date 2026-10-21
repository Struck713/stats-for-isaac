// The floor's layout drawn like the in-game minimap: explored rooms inked in, rooms the player
// never entered left as faint outlines, and icons for special rooms.
import { ROOM_SHAPE_CELLS, roomTypeName } from "@/lib/game";
import type { MapRoom } from "@/lib/runSchema";

const GRID_WIDTH = 13;
const CELL = 24;

// Glyphs for special RoomTypes (see the RoomType enum).
const ROOM_GLYPHS: Record<number, string> = {
  2: "$", // shop
  4: "♛", // treasure
  5: "☠", // boss
  6: "!", // miniboss
  7: "?", // secret
  8: "?", // super secret
  9: "♣", // arcade
  10: "✝", // curse
  11: "⚔", // challenge
  12: "✎", // library
  13: "♥", // sacrifice
  14: "⛧", // devil
  15: "✦", // angel
  18: "✚", // isaacs
  19: "♨", // barren
  20: "⚿", // chest
  21: "☾", // dice
  24: "★", // planetarium
  29: "☠", // ultra secret
};

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
        const glyph = c.room.type !== undefined ? ROOM_GLYPHS[c.room.type] : undefined;
        return (
          <div
            key={c.key}
            title={`${roomTypeName(c.room.typeName)}${visited ? "" : " (not entered)"}`}
            className="absolute flex items-center justify-center text-sm leading-none"
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
              color: c.room.type === 5 || c.room.type === 14 ? "var(--blood)" : "var(--ink)",
              opacity: visited ? 1 : 0.7,
            }}
          >
            {isMainCell && glyph}
          </div>
        );
      })}
    </div>
  );
}
