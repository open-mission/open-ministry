ALTER TABLE "user" ADD COLUMN "week_starts_on" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL;