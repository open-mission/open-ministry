CREATE TABLE "department_rehearsal_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" text NOT NULL,
	"label" text NOT NULL,
	"trigger_type" text NOT NULL,
	"offset_minutes" integer,
	"time_of_day" text,
	"channels" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rehearsal_reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" text NOT NULL,
	"department_id" text NOT NULL,
	"alert_rule_id" text,
	"label" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"channels" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"qstash_message_id" text,
	"sent_at" timestamp,
	"error_message" text,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rehearsal_song" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"song_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"musical_key" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_rehearsal_alert" ADD CONSTRAINT "department_rehearsal_alert_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_rehearsal_alert" ADD CONSTRAINT "department_rehearsal_alert_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_reminder" ADD CONSTRAINT "rehearsal_reminder_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_reminder" ADD CONSTRAINT "rehearsal_reminder_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_reminder" ADD CONSTRAINT "rehearsal_reminder_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_reminder" ADD CONSTRAINT "rehearsal_reminder_alert_rule_id_department_rehearsal_alert_id_fk" FOREIGN KEY ("alert_rule_id") REFERENCES "public"."department_rehearsal_alert"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_song" ADD CONSTRAINT "rehearsal_song_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_song" ADD CONSTRAINT "rehearsal_song_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "department_rehearsal_alert_departmentId_idx" ON "department_rehearsal_alert" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "department_rehearsal_alert_organizationId_idx" ON "department_rehearsal_alert" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rehearsal_reminder_eventId_idx" ON "rehearsal_reminder" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rehearsal_reminder_status_scheduledFor_idx" ON "rehearsal_reminder" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "rehearsal_reminder_organizationId_idx" ON "rehearsal_reminder" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rehearsal_reminder_dedupeKey_uidx" ON "rehearsal_reminder" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "rehearsal_song_eventId_idx" ON "rehearsal_song" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rehearsal_song_songId_idx" ON "rehearsal_song" USING btree ("song_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rehearsal_song_eventId_songId_uidx" ON "rehearsal_song" USING btree ("event_id","song_id");
--> statement-breakpoint
-- RLS: leitura de ensaios e lembretes pela conexão app_authenticated.
-- As mutações continuam na conexão owner, com autorização na aplicação.
ALTER TABLE public.rehearsal_song ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.department_rehearsal_alert ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.rehearsal_reminder ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY rehearsal_song_select_authenticated ON public.rehearsal_song
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event e
    WHERE e.id = rehearsal_song.event_id
      AND e.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
CREATE POLICY department_rehearsal_alert_select_authenticated ON public.department_rehearsal_alert
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
CREATE POLICY rehearsal_reminder_select_authenticated ON public.rehearsal_reminder
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint

GRANT SELECT ON public.rehearsal_song, public.department_rehearsal_alert, public.rehearsal_reminder TO app_authenticated;
