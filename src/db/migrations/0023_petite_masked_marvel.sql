CREATE TABLE "department_module" (
	"id" text PRIMARY KEY NOT NULL,
	"department_id" text NOT NULL,
	"module_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_module" ADD CONSTRAINT "department_module_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "department_module_departmentId_idx" ON "department_module" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "department_module_moduleKey_idx" ON "department_module" USING btree ("module_key");--> statement-breakpoint
CREATE UNIQUE INDEX "department_module_departmentId_moduleKey_uidx" ON "department_module" USING btree ("department_id","module_key");--> statement-breakpoint
ALTER TABLE public.department_module ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY department_module_select_authenticated ON public.department_module
  FOR SELECT TO app_authenticated
  USING (
    department_id IN (
      SELECT d.id FROM public.department d
      WHERE d.organization_id IN (SELECT current_user_org_ids())
    )
  );--> statement-breakpoint
GRANT SELECT ON public.department_module TO app_authenticated;