CREATE TABLE "organization_notification_channel" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"channel" text DEFAULT 'evolution_whatsapp' NOT NULL,
	"api_url" text,
	"api_key" text,
	"instance_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD CONSTRAINT "organization_notification_channel_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_notif_channel_org_idx" ON "organization_notification_channel" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_notif_channel_org_channel_uidx" ON "organization_notification_channel" USING btree ("organization_id","channel");--> statement-breakpoint
ALTER TABLE public.organization_notification_channel ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY org_notif_channel_select_authenticated ON public.organization_notification_channel
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.organization_notification_channel TO app_authenticated;
