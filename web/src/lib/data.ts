import "server-only";
import { count, desc, eq, sql, sum } from "drizzle-orm";
import { nanoid } from "nanoid";
import { connection } from "next/server";
import { getDb, schema } from "@/db";
import { denormalize } from "@/lib/denormalize";
import type { Run } from "@/lib/runSchema";
import type { SteamProfile } from "@/lib/steamApi";

const { runs, users } = schema;
const recency = sql`coalesce(${runs.endedAt}, ${runs.uploadedAt})`;

// Pages read the database at request time. Next can't tell a database query is request-time
// data, so without this it would try to bake the results into the build.
async function readDb() {
  await connection();
  return getDb();
}

export async function upsertUser(steamId: string, profile: SteamProfile) {
  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({ steamId, ...profile })
    .onConflictDoUpdate({ target: users.steamId, set: { ...profile, updatedAt: new Date() } })
    .returning({ id: users.id });
  return user.id;
}

// Inserts or replaces a user's run, keyed by the mod's run uid. Returns the public id.
export async function upsertRun(userId: number, run: Run, schemaVersion: number): Promise<string> {
  const db = await getDb();
  const columns = { ...denormalize(run), schemaVersion, data: run };
  const [row] = await db
    .insert(runs)
    .values({ publicId: nanoid(10), userId, uid: run.uid, ...columns })
    .onConflictDoUpdate({ target: [runs.userId, runs.uid], set: { ...columns, uploadedAt: new Date() } })
    .returning({ publicId: runs.publicId });
  return row.publicId;
}

const listColumns = {
  publicId: runs.publicId,
  seed: runs.seed,
  character: runs.character,
  characterName: runs.characterName,
  difficulty: runs.difficulty,
  challenge: runs.challenge,
  status: runs.status,
  totalFrames: runs.totalFrames,
  floorsReached: runs.floorsReached,
  finalFloorName: runs.finalFloorName,
  killedBy: runs.killedBy,
  itemCount: runs.itemCount,
  endedAt: runs.endedAt,
  uploadedAt: runs.uploadedAt,
};

export type RunListItem = Awaited<ReturnType<typeof listUserRuns>>[number];

export async function getUserBySteamId(steamId: string) {
  const db = await readDb();
  const [user] = await db.select().from(users).where(eq(users.steamId, steamId)).limit(1);
  return user ?? null;
}

export async function listUserRuns(userId: number, page: number, pageSize: number) {
  const db = await readDb();
  return db
    .select(listColumns)
    .from(runs)
    .where(eq(runs.userId, userId))
    .orderBy(desc(recency), desc(runs.id))
    .limit(pageSize)
    .offset(page * pageSize);
}

export async function getUserTotals(userId: number) {
  const db = await readDb();
  const [totals] = await db
    .select({
      runs: count(),
      wins: sql<number>`count(*) filter (where ${runs.status} = 'won')`.mapWith(Number),
      deaths: sql<number>`count(*) filter (where ${runs.status} = 'died')`.mapWith(Number),
      frames: sum(runs.totalFrames).mapWith(Number),
    })
    .from(runs)
    .where(eq(runs.userId, userId));
  const [favorite] = await db
    .select({ character: runs.character, characterName: runs.characterName, n: count() })
    .from(runs)
    .where(eq(runs.userId, userId))
    .groupBy(runs.character, runs.characterName)
    .orderBy(desc(count()))
    .limit(1);
  return { ...totals, frames: totals.frames ?? 0, favorite: favorite ?? null };
}

export async function getRun(publicId: string) {
  const db = await readDb();
  const [row] = await db
    .select({
      run: runs,
      owner: { steamId: users.steamId, personaName: users.personaName, avatarUrl: users.avatarUrl },
    })
    .from(runs)
    .innerJoin(users, eq(users.id, runs.userId))
    .where(eq(runs.publicId, publicId))
    .limit(1);
  return row ?? null;
}

export async function listRecentRuns(limit: number) {
  const db = await readDb();
  return db
    .select({ ...listColumns, ownerSteamId: users.steamId, ownerName: users.personaName })
    .from(runs)
    .innerJoin(users, eq(users.id, runs.userId))
    .orderBy(desc(recency), desc(runs.id))
    .limit(limit);
}
