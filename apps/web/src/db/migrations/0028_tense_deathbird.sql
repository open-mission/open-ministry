CREATE TABLE "department_permission_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" text NOT NULL,
	"grantee_user_id" text NOT NULL,
	"module_key" text NOT NULL,
	"action" text NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "organization_module" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"module_key" text NOT NULL,
	"action" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "department_id_organizationId_uidx" ON "department" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "department_permission_grant" ADD CONSTRAINT "department_permission_grant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_permission_grant" ADD CONSTRAINT "department_permission_grant_grantee_user_id_user_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_permission_grant" ADD CONSTRAINT "department_permission_grant_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_permission_grant" ADD CONSTRAINT "department_permission_grant_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_permission_grant" ADD CONSTRAINT "dept_perm_grant_dept_org_fk" FOREIGN KEY ("department_id","organization_id") REFERENCES "public"."department"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_module" ADD CONSTRAINT "organization_module_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_role_permission" ADD CONSTRAINT "organization_role_permission_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dept_perm_grant_org_idx" ON "department_permission_grant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dept_perm_grant_dept_idx" ON "department_permission_grant" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "dept_perm_grant_grantee_idx" ON "department_permission_grant" USING btree ("grantee_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dept_perm_grant_active_uidx" ON "department_permission_grant" USING btree ("organization_id","department_id","grantee_user_id","module_key","action") WHERE "department_permission_grant"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "org_module_org_idx" ON "organization_module" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_module_org_key_uidx" ON "organization_module" USING btree ("organization_id","module_key");--> statement-breakpoint
CREATE INDEX "org_role_perm_org_idx" ON "organization_role_permission" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_role_perm_org_role_action_uidx" ON "organization_role_permission" USING btree ("organization_id","role","module_key","action");--> statement-breakpoint
ALTER TABLE "organization_module" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "org_module_policy" ON "organization_module"
  FOR ALL TO app_authenticated
  USING ("organization_id" IN (SELECT current_user_org_ids()))
  WITH CHECK ("organization_id" IN (SELECT current_user_org_ids()));--> statement-breakpoint
ALTER TABLE "organization_role_permission" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "org_role_perm_policy" ON "organization_role_permission"
  FOR ALL TO app_authenticated
  USING ("organization_id" IN (SELECT current_user_org_ids()))
  WITH CHECK ("organization_id" IN (SELECT current_user_org_ids()));--> statement-breakpoint
ALTER TABLE "department_permission_grant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "dept_perm_grant_policy" ON "department_permission_grant"
  FOR ALL TO app_authenticated
  USING ("organization_id" IN (SELECT current_user_org_ids()))
  WITH CHECK ("organization_id" IN (SELECT current_user_org_ids()));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "organization_module", "organization_role_permission", "department_permission_grant" TO app_authenticated;--> statement-breakpoint
INSERT INTO "organization_module" ("id", "organization_id", "module_key", "enabled")
SELECT gen_random_uuid()::text, o.id, m.module_key, true
FROM "organization" o
CROSS JOIN (
  VALUES ('agenda'), ('schedules'), ('music'), ('announcements')
) AS m(module_key)
ON CONFLICT ("organization_id", "module_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "organization_role_permission" ("id", "organization_id", "role", "module_key", "action", "enabled")
SELECT
  gen_random_uuid()::text,
  o.id,
  p.role,
  p.module_key,
  p.action,
  p.enabled
FROM "organization" o
CROSS JOIN (
  VALUES
    ('admin', 'agenda', 'read', true),
    ('admin', 'agenda', 'createEvent', true),
    ('admin', 'agenda', 'updateEvent', true),
    ('admin', 'agenda', 'deleteEvent', true),
    ('admin', 'schedules', 'read', true),
    ('admin', 'schedules', 'assign', true),
    ('admin', 'schedules', 'editPlan', true),
    ('admin', 'schedules', 'manageTemplates', true),
    ('admin', 'schedules', 'manageOwnAvailability', true),
    ('admin', 'music', 'read', true),
    ('admin', 'music', 'createSong', true),
    ('admin', 'music', 'updateSong', true),
    ('admin', 'music', 'deleteSong', true),
    ('admin', 'announcements', 'read', true),
    ('admin', 'announcements', 'sendDepartment', true),
    ('admin', 'announcements', 'sendPerson', true),
    ('admin', 'announcements', 'sendAll', true),
    ('admin', 'announcements', 'retryDelivery', true),
    ('leader', 'agenda', 'read', true),
    ('leader', 'agenda', 'createEvent', true),
    ('leader', 'agenda', 'updateEvent', true),
    ('leader', 'agenda', 'deleteEvent', true),
    ('leader', 'schedules', 'read', true),
    ('leader', 'schedules', 'assign', true),
    ('leader', 'schedules', 'editPlan', true),
    ('leader', 'schedules', 'manageTemplates', false),
    ('leader', 'schedules', 'manageOwnAvailability', true),
    ('leader', 'music', 'read', true),
    ('leader', 'music', 'createSong', true),
    ('leader', 'music', 'updateSong', false),
    ('leader', 'music', 'deleteSong', false),
    ('leader', 'announcements', 'read', true),
    ('leader', 'announcements', 'sendDepartment', true),
    ('leader', 'announcements', 'sendPerson', true),
    ('leader', 'announcements', 'sendAll', false),
    ('leader', 'announcements', 'retryDelivery', false),
    ('member', 'agenda', 'read', true),
    ('member', 'agenda', 'createEvent', false),
    ('member', 'agenda', 'updateEvent', false),
    ('member', 'agenda', 'deleteEvent', false),
    ('member', 'schedules', 'read', true),
    ('member', 'schedules', 'assign', false),
    ('member', 'schedules', 'editPlan', false),
    ('member', 'schedules', 'manageTemplates', false),
    ('member', 'schedules', 'manageOwnAvailability', true),
    ('member', 'music', 'read', true),
    ('member', 'music', 'createSong', false),
    ('member', 'music', 'updateSong', false),
    ('member', 'music', 'deleteSong', false),
    ('member', 'announcements', 'read', true),
    ('member', 'announcements', 'sendDepartment', false),
    ('member', 'announcements', 'sendPerson', false),
    ('member', 'announcements', 'sendAll', false),
    ('member', 'announcements', 'retryDelivery', false)
) AS p(role, module_key, action, enabled)
ON CONFLICT ("organization_id", "role", "module_key", "action") DO NOTHING;--> statement-breakpoint
INSERT INTO "department_module" ("id", "department_id", "module_key")
SELECT
  gen_random_uuid()::text,
  d.id,
  m.module_key
FROM "department" d
CROSS JOIN (
  VALUES ('agenda'), ('schedules'), ('announcements')
) AS m(module_key)
ON CONFLICT ("department_id", "module_key") DO NOTHING;
