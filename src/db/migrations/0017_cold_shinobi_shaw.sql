CREATE TABLE "person_unavailability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text NOT NULL,
	"date" text NOT NULL,
	"reason" text,
	"all_day" boolean DEFAULT true NOT NULL,
	"periods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person_unavailability" ADD CONSTRAINT "person_unavailability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_unavailability" ADD CONSTRAINT "person_unavailability_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_unavailability_org_person_idx" ON "person_unavailability" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "person_unavailability_date_idx" ON "person_unavailability" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "person_unavailability_person_date_uidx" ON "person_unavailability" USING btree ("organization_id","person_id","date");--> statement-breakpoint
ALTER TABLE public.person_unavailability ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY person_unavailability_select_authenticated ON public.person_unavailability
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.person_unavailability TO app_authenticated;
