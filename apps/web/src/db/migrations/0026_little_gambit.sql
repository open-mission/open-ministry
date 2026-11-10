CREATE TABLE "whatsapp_message_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"notification_id" text,
	"batch_id" text,
	"type" text DEFAULT 'announcement' NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"person_id" text,
	"user_id" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"evolution_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "webhook_secret" text;--> statement-breakpoint
ALTER TABLE "whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_log_org_idx" ON "whatsapp_message_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "whatsapp_log_org_status_idx" ON "whatsapp_message_log" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "whatsapp_log_batch_idx" ON "whatsapp_message_log" USING btree ("organization_id","batch_id");--> statement-breakpoint
CREATE INDEX "whatsapp_log_evo_id_idx" ON "whatsapp_message_log" USING btree ("evolution_message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_log_created_at_idx" ON "whatsapp_message_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_log_phone_idx" ON "whatsapp_message_log" USING btree ("organization_id","recipient_phone");