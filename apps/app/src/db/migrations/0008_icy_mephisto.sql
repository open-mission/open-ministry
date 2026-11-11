CREATE TABLE "person" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"birthday" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_member" ADD COLUMN "person_id" text;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD COLUMN "person_id" text;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_organizationId_idx" ON "person" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "person_userId_idx" ON "person" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_organizationId_userId_uidx" ON "person" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_organizationId_email_uidx" ON "person" USING btree ("organization_id","email");--> statement-breakpoint
ALTER TABLE "department_member" ADD CONSTRAINT "department_member_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ADD CONSTRAINT "schedule_assignment_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "department_member_personId_idx" ON "department_member" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "schedule_assignment_personId_idx" ON "schedule_assignment" USING btree ("person_id");--> statement-breakpoint

-- Backfill: toda pessoa com conta que já pertence a uma igreja ganha um
-- registro em person. Depois os vínculos de departamento e escala são ligados
-- à pessoa correspondente.
INSERT INTO public.person
  (id, organization_id, user_id, name, email, image, birthday, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  m.organization_id,
  u.id,
  u.name,
  lower(u.email),
  u.image,
  u.birthday,
  now(),
  now()
FROM public.member m
JOIN public."user" u ON u.id = m.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = m.organization_id
    AND p.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = m.organization_id
    AND lower(p.email) = lower(u.email)
);--> statement-breakpoint

INSERT INTO public.person
  (id, organization_id, user_id, name, email, image, birthday, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  d.organization_id,
  u.id,
  u.name,
  lower(u.email),
  u.image,
  u.birthday,
  now(),
  now()
FROM public.department_member dm
JOIN public.department d ON d.id = dm.department_id
JOIN public."user" u ON u.id = dm.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = d.organization_id
    AND p.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = d.organization_id
    AND lower(p.email) = lower(u.email)
);--> statement-breakpoint

INSERT INTO public.person
  (id, organization_id, user_id, name, email, image, birthday, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  e.organization_id,
  u.id,
  u.name,
  lower(u.email),
  u.image,
  u.birthday,
  now(),
  now()
FROM public.schedule_assignment sa
JOIN public.schedule s ON s.id = sa.schedule_id
JOIN public.event e ON e.id = s.event_id
JOIN public."user" u ON u.id = sa.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = e.organization_id
    AND p.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.person p
  WHERE p.organization_id = e.organization_id
    AND lower(p.email) = lower(u.email)
);--> statement-breakpoint

UPDATE public.department_member dm
SET person_id = p.id
FROM public.department d, public.person p
WHERE d.id = dm.department_id
  AND p.organization_id = d.organization_id
  AND p.user_id = dm.user_id;--> statement-breakpoint

UPDATE public.schedule_assignment sa
SET person_id = p.id
FROM public.schedule s, public.event e, public.person p
WHERE s.id = sa.schedule_id
  AND e.id = s.event_id
  AND p.organization_id = e.organization_id
  AND p.user_id = sa.user_id;--> statement-breakpoint

ALTER TABLE public.person ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY person_select_authenticated ON public.person
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.person TO app_authenticated;