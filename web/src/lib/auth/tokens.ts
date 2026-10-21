import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { API_TOKEN_PATTERN, newApiToken, sha256 } from "./crypto";

export async function createApiToken(userId: number, name: string): Promise<string> {
  const token = newApiToken();
  const db = await getDb();
  await db.insert(schema.apiTokens).values({
    userId,
    name,
    tokenHash: sha256(token),
    prefix: token.slice(0, 8),
  });
  return token;
}

export async function revokeApiToken(userId: number, tokenId: number) {
  const db = await getDb();
  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiTokens.id, tokenId), eq(schema.apiTokens.userId, userId)));
}

export async function listApiTokens(userId: number) {
  const db = await getDb();
  return db
    .select({
      id: schema.apiTokens.id,
      name: schema.apiTokens.name,
      prefix: schema.apiTokens.prefix,
      createdAt: schema.apiTokens.createdAt,
      lastUsedAt: schema.apiTokens.lastUsedAt,
    })
    .from(schema.apiTokens)
    .where(and(eq(schema.apiTokens.userId, userId), isNull(schema.apiTokens.revokedAt)))
    .orderBy(schema.apiTokens.createdAt);
}

// Resolves "Authorization: Bearer sfi_..." to the token owner's user id.
export async function authenticateBearer(authorization: string | null): Promise<number | null> {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !API_TOKEN_PATTERN.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(schema.apiTokens.tokenHash, sha256(token)), isNull(schema.apiTokens.revokedAt)))
    .returning({ userId: schema.apiTokens.userId });
  return row?.userId ?? null;
}
