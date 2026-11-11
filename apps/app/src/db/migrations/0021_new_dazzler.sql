CREATE TABLE "organization_message_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_message_template" ADD CONSTRAINT "organization_message_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_msg_template_org_idx" ON "organization_message_template" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_msg_template_org_type_uidx" ON "organization_message_template" USING btree ("organization_id","type");