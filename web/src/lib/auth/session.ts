import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { randomBase62, sha256 } from "./crypto";

export const SESSION_COOKIE = "sfi_session";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: number;
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
}

export async function createSession(userId: number) {
  const token = randomBase62(43);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = await getDb();
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function deleteSession(token: string) {
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
}

// The signed-in user for this request, or null. Reads cookies, so callers must sit inside a
// <Suspense> boundary (or be a route handler / server action).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // The database driver reads the clock internally. Cookies alone don't make this request-time as
  // far as Next is concerned, so mark it explicitly (same as readDb in lib/data.ts).
  await connection();
  const db = await getDb();
  const [row] = await db
    .select({
      id: schema.users.id,
      steamId: schema.users.steamId,
      personaName: schema.users.personaName,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    // Compare against the database's clock so expiry doesn't depend on the web server's.
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, sql`now()`)))
    .limit(1);
  return row ?? null;
});
