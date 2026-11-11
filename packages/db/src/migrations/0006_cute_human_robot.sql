CREATE TABLE "department" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_function" (
	"id" text PRIMARY KEY NOT NULL,
	"department_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_member" (
	"id" text PRIMARY KEY NOT NULL,
	"department_id" text NOT NULL,
	"user_id" text NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_member_function" (
	"id" text PRIMARY KEY NOT NULL,
	"department_member_id" text NOT NULL,
	"function_id" text NOT NULL,
	"experience_level" text DEFAULT 'beginner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_function" ADD CONSTRAINT "department_function_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_member" ADD CONSTRAINT "department_member_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_member" ADD CONSTRAINT "department_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_member_function" ADD CONSTRAINT "department_member_function_department_member_id_department_member_id_fk" FOREIGN KEY ("department_member_id") REFERENCES "public"."department_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_member_function" ADD CONSTRAINT "department_member_function_function_id_department_function_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."department_function"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "department_organizationId_idx" ON "department" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_organizationId_name_uidx" ON "department" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "department_function_departmentId_idx" ON "department_function" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_function_departmentId_name_uidx" ON "department_function" USING btree ("department_id","name");--> statement-breakpoint
CREATE INDEX "department_member_departmentId_idx" ON "department_member" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "department_member_userId_idx" ON "department_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_member_departmentId_userId_uidx" ON "department_member" USING btree ("department_id","user_id");--> statement-breakpoint
CREATE INDEX "department_member_function_memberId_idx" ON "department_member_function" USING btree ("department_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "department_member_function_memberId_functionId_uidx" ON "department_member_function" USING btree ("department_member_id","function_id");--> statement-breakpoint

-- RLS: leituras dos departamentos pela conexão app_authenticated. As mutações
-- continuam na conexão owner, com autorização na aplicação.
ALTER TABLE public.department ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.department_function ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.department_member ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.department_member_function ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY department_select_authenticated ON public.department
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
CREATE POLICY department_function_select_authenticated ON public.department_function
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.department d
    WHERE d.id = department_function.department_id
      AND d.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
CREATE POLICY department_member_select_authenticated ON public.department_member
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1 FROM public.department d
    WHERE d.id = department_member.department_id
      AND d.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint
CREATE POLICY department_member_function_select_authenticated ON public.department_member_function
  FOR SELECT TO app_authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.department_member dm
    JOIN public.department d ON d.id = dm.department_id
    WHERE dm.id = department_member_function.department_member_id
      AND d.organization_id IN (SELECT public.current_user_org_ids())
  ));--> statement-breakpoint

GRANT SELECT ON public.department, public.department_function, public.department_member, public.department_member_function TO app_authenticated;