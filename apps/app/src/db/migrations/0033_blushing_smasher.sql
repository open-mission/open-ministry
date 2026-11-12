CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp with time zone,
	"deadline" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'none' NOT NULL,
	"url" text,
	"scope" text DEFAULT 'personal' NOT NULL,
	"department_id" text,
	"created_by_id" text NOT NULL,
	"assignee_id" text,
	"assignee_person_id" text,
	"delegation_type" text DEFAULT 'single' NOT NULL,
	"parent_task_id" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_person_id_person_id_fk" FOREIGN KEY ("assignee_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_audit_log" ADD CONSTRAINT "task_audit_log_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_audit_log" ADD CONSTRAINT "task_audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_audit_log" ADD CONSTRAINT "task_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_organizationId_idx" ON "task" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_org_status_idx" ON "task" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "task_org_created_by_idx" ON "task" USING btree ("organization_id","created_by_id");--> statement-breakpoint
CREATE INDEX "task_org_assignee_idx" ON "task" USING btree ("organization_id","assignee_id");--> statement-breakpoint
CREATE INDEX "task_org_dept_idx" ON "task" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "task_org_scope_idx" ON "task" USING btree ("organization_id","scope");--> statement-breakpoint
CREATE INDEX "task_date_idx" ON "task" USING btree ("date");--> statement-breakpoint
CREATE INDEX "task_deadline_idx" ON "task" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "task_parent_idx" ON "task" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "task_audit_task_idx" ON "task_audit_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_audit_org_idx" ON "task_audit_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_audit_created_idx" ON "task_audit_log" USING btree ("created_at");