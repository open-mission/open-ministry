CREATE TABLE "person_mood" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text NOT NULL,
	"user_id" text,
	"date" text NOT NULL,
	"score" integer NOT NULL,
	"needs_prayer" boolean DEFAULT false NOT NULL,
	"needs_talk" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person_mood" ADD CONSTRAINT "person_mood_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_mood" ADD CONSTRAINT "person_mood_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_mood" ADD CONSTRAINT "person_mood_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_mood_org_person_idx" ON "person_mood" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "person_mood_org_date_idx" ON "person_mood" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "person_mood_person_date_uidx" ON "person_mood" USING btree ("organization_id","person_id","date");