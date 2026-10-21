CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"uid" text NOT NULL,
	"seed" text NOT NULL,
	"run_number" integer NOT NULL,
	"character" integer NOT NULL,
	"character_name" text NOT NULL,
	"difficulty" integer NOT NULL,
	"challenge" integer NOT NULL,
	"greed_mode" boolean NOT NULL,
	"status" text NOT NULL,
	"total_frames" integer NOT NULL,
	"floors_reached" integer NOT NULL,
	"final_floor_name" text,
	"killed_by" text,
	"item_count" integer NOT NULL,
	"partial" boolean NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"schema_version" integer NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "runs_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"steam_id" text NOT NULL,
	"persona_name" text NOT NULL,
	"avatar_url" text,
	"profile_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_steam_id_unique" UNIQUE("steam_id")
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "runs_user_uid" ON "runs" USING btree ("user_id","uid");--> statement-breakpoint
CREATE INDEX "runs_user_recent" ON "runs" USING btree ("user_id",coalesce("ended_at", "uploaded_at") desc);--> statement-breakpoint
CREATE INDEX "runs_recent" ON "runs" USING btree (coalesce("ended_at", "uploaded_at") desc);