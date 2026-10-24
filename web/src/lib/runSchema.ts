// Types and validation for runs uploaded by the mod. The authoritative description is
// mod/SCHEMA.md; validation only checks what the site relies on and keeps every other field.
import { z } from "zod";

export type Resources = Record<string, { gained: number; spent: number }>;

export interface Item {
  kind: "collectible" | "trinket";
  id: number;
  name?: string;
  price?: number;
  frame?: number;
  player?: number;
  count?: number;
}

export interface Use {
  kind: "card" | "pill" | "active";
  id: number;
  flags: number;
  frame: number;
  player: number;
}

export interface Hit {
  amount: number;
  flags: number;
  sourceType: number;
  sourceTypeName?: string;
  sourceVariant: number;
  sourceSubtype?: number;
  frame: number;
  player: number;
}

export interface Kill {
  type: number;
  typeName?: string;
  variant: number;
  subtype: number;
  isBoss: boolean;
  frame: number;
}

export interface Pickup {
  variant: number;
  variantName?: string;
  subtype: number;
  price?: number;
  frame: number;
  player: number;
}

export interface MapRoom {
  gridIndex: number;
  safeGridIndex: number;
  listIndex: number;
  shape?: number;
  type?: number;
  typeName?: string;
  variant?: number;
  name?: string;
  visitedCount: number;
  clear: boolean;
  displayFlags: number;
}

export interface RoomVisit {
  gridIndex: number;
  safeGridIndex: number;
  listIndex: number;
  type: number;
  typeName?: string;
  shape: number;
  variant?: number;
  name?: string;
  firstVisit: boolean;
  wasClearOnEnter: boolean;
  resumed?: boolean;
  enterFrame: number;
  exitFrame?: number;
  durationFrames?: number;
  clearedAtFrame?: number;
  clearFrames?: number;
  bossId?: number;
  pickups: Pickup[];
  resources: Resources;
  items: Item[];
  used: Use[];
  damage: Hit[];
  kills: Kill[];
}

export interface PlayerSnapshot {
  player: number;
  type: number;
  name: string;
  damage: number;
  maxFireDelay: number;
  tearRange: number;
  shotSpeed: number;
  moveSpeed: number;
  luck: number;
  collectibleCount: number;
  [resource: string]: number | string;
}

export interface FloorSummary {
  roomsInLayout: number;
  roomsExplored: number;
  roomsCleared: number;
  roomVisits: number;
  pickups: Record<string, number>;
  resources: Resources;
  items: number;
  used: number;
  hits: number;
  damageTaken: number;
  kills: number;
  bossKills: number;
  durationSeconds?: number;
}

export interface Floor {
  index: number;
  stage: number;
  stageType: number;
  absoluteStage: number;
  name: string;
  curses: number;
  curseName: string;
  enterFrame: number;
  exitFrame?: number;
  durationFrames?: number;
  statsOnEnter: PlayerSnapshot[];
  statsOnExit?: PlayerSnapshot[];
  map: MapRoom[];
  rooms: RoomVisit[];
  summary?: FloorSummary;
}

export interface LastHit {
  hit: Hit;
  floor: number;
  roomType: string;
  gridIndex: number;
}

export interface Run {
  id: string;
  uid: string;
  number: number;
  seed: string;
  character: number;
  characterName: string;
  difficulty: number;
  challenge: number;
  greedMode: boolean;
  status: "won" | "died" | "abandoned";
  totalFrames: number;
  partial?: boolean;
  startingItems: Item[];
  floors: Floor[];
  endedOnFloor?: number;
  deathCause?: LastHit;
  startedAt?: number;
  endedAt?: number;
  uploaded?: boolean;
}

// Isaac's json.lua writes empty objects as [].
const record = <T extends z.ZodType>(value: T) =>
  z.preprocess((v) => (Array.isArray(v) && v.length === 0 ? {} : v), z.record(z.string(), value));

const resources = record(z.object({ gained: z.number(), spent: z.number() }));

const roomVisit = z.looseObject({
  type: z.number(),
  enterFrame: z.number(),
  pickups: z.array(z.unknown()).default([]),
  resources: resources.default({}),
  items: z.array(z.unknown()).default([]),
  used: z.array(z.unknown()).default([]),
  damage: z.array(z.unknown()).default([]),
  kills: z.array(z.unknown()).default([]),
});

const floor = z.looseObject({
  index: z.number().int(),
  stage: z.number().int().optional(),
  absoluteStage: z.number().int().optional(),
  name: z.string(),
  enterFrame: z.number(),
  statsOnEnter: z.array(z.unknown()).default([]),
  map: z.array(z.unknown()).default([]),
  rooms: z.array(roomVisit).default([]),
  summary: z
    .looseObject({
      pickups: record(z.number()).default({}),
      resources: resources.default({}),
    })
    .optional(),
});

export const runSchema = z.looseObject({
  uid: z.string().regex(/^[0-9a-f]{8,64}$/),
  id: z.string().max(64),
  number: z.number().int(),
  seed: z.string().max(16),
  character: z.number().int(),
  characterName: z.string().max(64),
  difficulty: z.number().int(),
  challenge: z.number().int(),
  greedMode: z.boolean(),
  status: z.enum(["won", "died", "abandoned"]),
  totalFrames: z.number().int().nonnegative(),
  startingItems: z.array(z.unknown()).default([]),
  floors: z.array(floor),
  startedAt: z.number().int().optional(),
  endedAt: z.number().int().optional(),
});

export const MAX_RUNS_PER_UPLOAD = 50;

export const uploadSchema = z.object({
  schemaVersion: z.number().int(),
  runs: z.array(z.unknown()).max(MAX_RUNS_PER_UPLOAD),
});

export type ParsedRun = { ok: true; run: Run } | { ok: false; uid?: string; error: string };

export function parseRun(input: unknown): ParsedRun {
  const result = runSchema.safeParse(input);
  if (!result.success) {
    const uid =
      input && typeof input === "object" && typeof (input as { uid?: unknown }).uid === "string"
        ? (input as { uid: string }).uid
        : undefined;
    const issue = result.error.issues[0];
    return { ok: false, uid, error: `${issue.path.join(".") || "run"}: ${issue.message}` };
  }
  // Drop the mod's local bookkeeping before storing.
  const run = { ...result.data } as unknown as Run;
  delete run.uploaded;
  return { ok: true, run };
}

// Holding R to scout a start (checking the first item room, then resetting) all happens on the
// first floor, so an abandoned run only counts once it gets past that floor. Stages are compared
// rather than floors counted, since a restart can tack the next game's first floor onto the run.
export function wasPlayed(run: Run): boolean {
  if (run.status !== "abandoned" || run.partial) return true;
  const stageOf = (floor: Floor) => floor.absoluteStage ?? floor.stage;
  const first = run.floors[0];
  return !!first && run.floors.some((floor) => stageOf(floor) > stageOf(first));
}
