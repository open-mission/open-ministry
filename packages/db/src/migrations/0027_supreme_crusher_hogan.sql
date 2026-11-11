CREATE TABLE "background_job" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "is_public_share_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "public_share_token" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "public_share_allow_pdf" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "public_share_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bg_job_org_idx" ON "background_job" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bg_job_org_status_idx" ON "background_job" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "bg_job_created_idx" ON "background_job" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "event_publicShareToken_idx" ON "event" USING btree ("public_share_token");--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_public_share_token_unique" UNIQUE("public_share_token");