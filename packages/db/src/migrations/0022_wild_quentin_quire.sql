ALTER TABLE "user" ADD COLUMN "pwa_installed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pwa_installed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pwa_platform" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pwa_last_seen_at" timestamp;