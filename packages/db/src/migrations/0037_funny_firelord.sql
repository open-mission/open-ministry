CREATE TABLE "calendar_feed" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"include_services" boolean DEFAULT true NOT NULL,
	"include_rehearsals" boolean DEFAULT true NOT NULL,
	"include_department_events" boolean DEFAULT true NOT NULL,
	"include_assignments" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"last_used_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_feed" ADD CONSTRAINT "calendar_feed_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_feed" ADD CONSTRAINT "calendar_feed_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_feed" ADD CONSTRAINT "calendar_feed_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_feed_tokenHash_uidx" ON "calendar_feed" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "calendar_feed_organizationId_idx" ON "calendar_feed" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "calendar_feed_organizationId_personId_idx" ON "calendar_feed" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "calendar_feed_personId_idx" ON "calendar_feed" USING btree ("person_id");--> statement-breakpoint
-- RLS: cada membro só enxerga o próprio feed pela conexão app_authenticated.
-- As mutações ficam na conexão owner, com autorização na aplicação. O token
-- bruto nunca é armazenado (só o hash), então nem o dono da linha consegue
-- reconstruir o link a partir do banco.
ALTER TABLE public.calendar_feed ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY calendar_feed_select_own ON public.calendar_feed
  FOR SELECT TO app_authenticated
  USING (
    organization_id IN (SELECT public.current_user_org_ids())
    AND person_id IN (
      SELECT p.id
      FROM public.person p
      WHERE p.organization_id = calendar_feed.organization_id
        AND p.user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )
  );--> statement-breakpoint
GRANT SELECT ON public.calendar_feed TO app_authenticated;