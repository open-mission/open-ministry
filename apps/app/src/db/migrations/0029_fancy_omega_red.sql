CREATE TABLE "email_message_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"notification_id" text,
	"batch_id" text,
	"type" text DEFAULT 'transactional' NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"subject" text NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"person_id" text,
	"user_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"brevo_message_id" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_message_log" ADD CONSTRAINT "email_message_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_log" ADD CONSTRAINT "email_message_log_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_log" ADD CONSTRAINT "email_message_log_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message_log" ADD CONSTRAINT "email_message_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_org_idx" ON "email_message_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_log_org_status_idx" ON "email_message_log" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "email_log_recipient_idx" ON "email_message_log" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_log_type_idx" ON "email_message_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "email_log_created_at_idx" ON "email_message_log" USING btree ("created_at");