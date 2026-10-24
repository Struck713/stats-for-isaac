// Readable names and formatting for the numeric game values stored in runs.
import type { Hit, Item, Use } from "@/lib/runSchema";
import names from "./names.json";
import wiki from "./wiki.json";

type Table = Record<string, string>;
const table = (t: Table, id: number) => t[String(id)];

export const FPS = 30;

// "#THE_SAD_ONION_NAME" -> "The Sad Onion"
function prettyKey(key: string): string {
  return key
    .replace(/^#/, "")
    .replace(/_NAME$/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function itemName(item: Pick<Item, "kind" | "id" | "name">): string {
  // Modded items carry a real name; vanilla ones carry a localization key.
  if (item.name && !item.name.startsWith("#")) return item.name;
  const known = table(item.kind === "trinket" ? names.trinkets : names.collectibles, item.id);
  if (known) return known;
  if (item.name) return prettyKey(item.name);
  return `${item.kind === "trinket" ? "Trinket" : "Item"} #${item.id}`;
}

const WIKI = "https://bindingofisaacrebirth.wiki.gg/wiki/";
const wikiUrl = (page: string) => WIKI + encodeURIComponent(page.replaceAll(" ", "_"));
// Golden trinkets are their base id with this bit set.
const GOLDEN_TRINKET = 1 << 15;

// The wiki page and icon for a vanilla item; modded items (which carry a real name) have none.
export function itemWiki(item: Pick<Item, "kind" | "id" | "name">): { url: string; image?: string } | undefined {
  if (item.name && !item.name.startsWith("#")) return undefined;
  const entries: Record<string, { page: string; image?: string }> =
    item.kind === "trinket" ? wiki.trinkets : wiki.collectibles;
  const entry = entries[String(item.kind === "trinket" ? item.id & ~GOLDEN_TRINKET : item.id)];
  if (!entry) return undefined;
  return { url: wikiUrl(entry.page), image: entry.image };
}

// The wiki page and sprite for a vanilla character; modded characters have none.
export function characterWiki(id: number): { url: string; image: { url: string; width: number; height: number } } | undefined {
  const entry = (wiki.characters as Record<string, { page: string; image: { url: string; width: number; height: number } }>)[String(id)];
  return entry && { url: wikiUrl(entry.page), image: entry.image };
}

export type SpriteName = keyof typeof wiki.sprites;

export const isSpriteName = (name: string): name is SpriteName => name in wiki.sprites;

// A HUD or minimap sprite from the wiki, with its native pixel size.
export function sprite(name: SpriteName): { url: string; width: number; height: number } {
  return wiki.sprites[name];
}

export function usedItemName(use: Use): string {
  if (use.kind === "card") return table(names.cards, use.id) ?? `Card #${use.id}`;
  if (use.kind === "pill") return table(names.pills, use.id) ?? `Pill #${use.id}`;
  return itemName({ kind: "collectible", id: use.id });
}

export function characterName(id: number, fallback?: string): string {
  return table(names.characters, id) ?? fallback ?? `Character #${id}`;
}

export function entityName(type: number, fallback?: string): string {
  const name = table(names.entities, type);
  if (name) return name;
  if (fallback) return prettyKey(fallback.replace(/^ENTITY_/, ""));
  return `Entity #${type}`;
}

export function challengeName(id: number): string | undefined {
  return id === 0 ? undefined : (table(names.challenges, id) ?? `Challenge #${id}`);
}

export function difficultyName(difficulty: number): string {
  return ["Normal", "Hard", "Greed", "Greedier"][difficulty] ?? `Difficulty ${difficulty}`;
}

// Damage with no source entity, named from its DamageFlag bits.
const DAMAGE_FLAG_SOURCES: [number, string][] = [
  [1 << 7, "Spikes"],
  [1 << 16, "a Curse Room door"],
  [1 << 10, "a Devil Deal"],
  [1 << 18, "the IV Bag"],
  [1 << 20, "a Spiked Chest"],
  [1 << 12, "TNT"],
  [1 << 2, "an explosion"],
  [1 << 1, "fire"],
  [1 << 9, "a red poop"],
  [1 << 19, "a pitfall"],
  [1 << 5, "self-damage"],
];

export function hitSourceName(hit: Hit): string {
  if (hit.sourceType !== 0) return entityName(hit.sourceType, hit.sourceTypeName);
  for (const [flag, name] of DAMAGE_FLAG_SOURCES) {
    if (hit.flags & flag) return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return "Unknown";
}

// "ROOM_TREASURE" -> "Treasure"
export function roomTypeName(typeName?: string): string {
  if (!typeName) return "Room";
  return prettyKey(typeName.replace(/^ROOM_/, ""));
}

export function formatFrames(frames: number): string {
  const total = Math.floor(frames / FPS);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function tearsPerSecond(maxFireDelay: number): number {
  return 30 / (maxFireDelay + 1);
}

// Cells covered by a room relative to its top-left anchor, by RoomShape.
export const ROOM_SHAPE_CELLS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[0, 0]],
  3: [[0, 0]],
  4: [[0, 0], [0, 1]],
  5: [[0, 0], [0, 1]],
  6: [[0, 0], [1, 0]],
  7: [[0, 0], [1, 0]],
  8: [[0, 0], [1, 0], [0, 1], [1, 1]],
  9: [[1, 0], [0, 1], [1, 1]],
  10: [[0, 0], [0, 1], [1, 1]],
  11: [[0, 0], [1, 0], [1, 1]],
  12: [[0, 0], [1, 0], [0, 1]],
};
