CREATE TABLE "event_plan_item" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"section_id" text,
	"type" text DEFAULT 'item' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"person_id" text,
	"custom_responsible" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_plan_item" ADD CONSTRAINT "event_plan_item_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_plan_item" ADD CONSTRAINT "event_plan_item_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_plan_item_eventId_idx" ON "event_plan_item" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_plan_item_order_idx" ON "event_plan_item" USING btree ("event_id","order");--> statement-breakpoint
CREATE INDEX "event_plan_item_sectionId_idx" ON "event_plan_item" USING btree ("section_id");--> statement-breakpoint
ALTER TABLE public.event_plan_item ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY event_plan_item_select_authenticated ON public.event_plan_item
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event e
    WHERE e.id = event_plan_item.event_id
      AND e.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
GRANT SELECT ON public.event_plan_item TO app_authenticated;
