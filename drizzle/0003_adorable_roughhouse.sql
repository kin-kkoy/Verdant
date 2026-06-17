ALTER TABLE "access_requests" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_code_unique" UNIQUE("code");