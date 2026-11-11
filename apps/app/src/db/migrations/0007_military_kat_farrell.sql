CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"series_id" text,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'service' NOT NULL,
	"location" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"recurrence" text,
	"recurrence_interval" integer,
	"recurrence_ends_at" timestamp,
	"is_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_department" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"department_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"department_id" text NOT NULL,
	"function_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_department" ADD CONSTRAINT "event_department_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_department" ADD CONSTRAINT "event_department_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_function_id_department_function_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."department_function"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_organizationId_idx" ON "event" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "event_organizationId_startsAt_idx" ON "event" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "event_seriesId_idx" ON "event" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "event_department_eventId_idx" ON "event_department" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_department_departmentId_idx" ON "event_department" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_department_eventId_departmentId_uidx" ON "event_department" USING btree ("event_id","department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_eventId_uidx" ON "schedule" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "schedule_assignment_scheduleId_idx" ON "schedule_assignment" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "schedule_assignment_userId_idx" ON "schedule_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_assignment_scheduleId_functionId_userId_uidx" ON "schedule_assignment" USING btree ("schedule_id","function_id","user_id");--> statement-breakpoint

-- RLS: leituras de cultos, eventos e escalas pela conexão app_authenticated.
-- As mutações continuam na conexão owner, com autorização na aplicação.
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.event_department ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.schedule_assignment ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY event_select_authenticated ON public.event
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
CREATE POLICY event_department_select_authenticated ON public.event_department
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event e
    WHERE e.id = event_department.event_id
      AND e.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
CREATE POLICY schedule_select_authenticated ON public.schedule
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event e
    WHERE e.id = schedule.event_id
      AND e.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
CREATE POLICY schedule_assignment_select_authenticated ON public.schedule_assignment
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.schedule s
    JOIN public.event e ON e.id = s.event_id
    WHERE s.id = schedule_assignment.schedule_id
      AND e.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint

GRANT SELECT ON public.event, public.event_department, public.schedule, public.schedule_assignment TO app_authenticated;