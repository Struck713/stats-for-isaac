import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Run } from "@/lib/runSchema";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  steamId: text("steam_id").notNull().unique(),
  personaName: text("persona_name").notNull(),
  avatarUrl: text("avatar_url"),
  profileUrl: text("profile_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  // sha256 of the cookie value, so a database leak doesn't hand out live sessions.
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  // The first few characters, so the account page can tell tokens apart.
  prefix: text("prefix").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const runs = pgTable(
  "runs",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    uid: text("uid").notNull(),
    seed: text("seed").notNull(),
    runNumber: integer("run_number").notNull(),
    character: integer("character").notNull(),
    characterName: text("character_name").notNull(),
    difficulty: integer("difficulty").notNull(),
    challenge: integer("challenge").notNull(),
    greedMode: boolean("greed_mode").notNull(),
    status: text("status").notNull(),
    totalFrames: integer("total_frames").notNull(),
    floorsReached: integer("floors_reached").notNull(),
    finalFloorName: text("final_floor_name"),
    killedBy: text("killed_by"),
    itemCount: integer("item_count").notNull(),
    partial: boolean("partial").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    schemaVersion: integer("schema_version").notNull(),
    data: jsonb("data").$type<Run>().notNull(),
  },
  (t) => [
    uniqueIndex("runs_user_uid").on(t.userId, t.uid),
    index("runs_user_recent").on(t.userId, sql`coalesce(${t.endedAt}, ${t.uploadedAt}) desc`),
    index("runs_recent").on(sql`coalesce(${t.endedAt}, ${t.uploadedAt}) desc`),
  ],
);

export type User = typeof users.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
