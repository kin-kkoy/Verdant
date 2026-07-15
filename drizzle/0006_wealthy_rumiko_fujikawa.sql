CREATE TABLE "gardens" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sun" integer DEFAULT 0 NOT NULL,
	"water" integer DEFAULT 0 NOT NULL,
	"compost" integer DEFAULT 0 NOT NULL,
	"bloom_spent" integer DEFAULT 0 NOT NULL,
	"skin" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plant_state" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"automation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;