CREATE TABLE "profile_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"viewer_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_invites_owner_viewer" UNIQUE("owner_id","viewer_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_visibility" text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_invites" ADD CONSTRAINT "profile_invites_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_invites" ADD CONSTRAINT "profile_invites_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;