CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_organizationId_userId_idx" ON "notification" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "notification_userId_readAt_idx" ON "notification" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notification_createdAt_idx" ON "notification" USING btree ("created_at");--> statement-breakpoint

-- RLS: cada pessoa lê e marca apenas as próprias notificações da igreja ativa.
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY notification_select_own ON public.notification
  FOR SELECT TO app_authenticated
  USING (
    user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    AND organization_id IN (SELECT public.current_user_org_ids())
  );--> statement-breakpoint
CREATE POLICY notification_update_own ON public.notification
  FOR UPDATE TO app_authenticated
  USING (
    user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    AND organization_id IN (SELECT public.current_user_org_ids())
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    AND organization_id IN (SELECT public.current_user_org_ids())
  );--> statement-breakpoint
GRANT SELECT, UPDATE ON public.notification TO app_authenticated;