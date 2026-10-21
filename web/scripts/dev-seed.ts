// Local dev only: creates a test user with an API token in the PGlite database and prints the
// token, so uploads can be tried without signing in through Steam. Stop `npm run dev` first; PGlite
// only allows one process at a time.
//   npm run dev:seed
//   curl -X POST localhost:3000/api/runs -H "Authorization: Bearer <token>" \
//     -H "Content-Type: application/json" --data-binary @fixtures/sample-upload.json
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { newApiToken, sha256 } from "../src/lib/auth/crypto";
import * as schema from "../src/db/schema";

const STEAM_ID = "76561197960287930";

async function main() {
  if (process.env.DATABASE_URL) throw new Error("dev:seed only works on the local PGlite database");
  const root = path.resolve(__dirname, "..");
  const dir = path.join(root, ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(root, "drizzle") });

  const [user] = await db
    .insert(schema.users)
    .values({ steamId: STEAM_ID, personaName: "Dev Player" })
    .onConflictDoUpdate({ target: schema.users.steamId, set: { updatedAt: new Date() } })
    .returning();
  const token = newApiToken();
  await db.insert(schema.apiTokens).values({
    userId: user.id,
    name: "dev seed",
    tokenHash: sha256(token),
    prefix: token.slice(0, 8),
  });
  await client.close();
  console.log(`User: Dev Player (/u/${STEAM_ID})\nToken: ${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
