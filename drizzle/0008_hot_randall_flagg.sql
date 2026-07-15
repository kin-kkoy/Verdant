ALTER TABLE "users" ADD COLUMN "reminder_minute" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'Asia/Singapore' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_nudged_day" date;