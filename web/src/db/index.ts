import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

// With DATABASE_URL set this talks to a real Postgres; without it (local dev) it uses PGlite, an
// embedded Postgres stored in .data/pglite, so there's nothing to install. Migrations are applied
// the first time the database is used.
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const db = drizzle(postgres(url, { max: 10 }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

// Kept on globalThis so dev hot reloads don't open a second PGlite on the same directory.
const g = globalThis as unknown as { __sfiDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__sfiDb ??= connect().catch((err) => {
    g.__sfiDb = undefined;
    throw err;
  });
  return g.__sfiDb;
}

export { schema };
