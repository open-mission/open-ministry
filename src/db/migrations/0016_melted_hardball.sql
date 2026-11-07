CREATE TABLE "person_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"periods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person_availability" ADD CONSTRAINT "person_availability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_availability" ADD CONSTRAINT "person_availability_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_availability_org_person_idx" ON "person_availability" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_availability_person_day_uidx" ON "person_availability" USING btree ("organization_id","person_id","day_of_week");--> statement-breakpoint
ALTER TABLE public.person_availability ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY person_availability_select_authenticated ON public.person_availability
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.person_availability TO app_authenticated;
