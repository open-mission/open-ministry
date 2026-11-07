CREATE TABLE "plan_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_template" ADD CONSTRAINT "plan_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_template_organizationId_idx" ON "plan_template" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE public.plan_template ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY plan_template_select_authenticated ON public.plan_template
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.plan_template TO app_authenticated;
