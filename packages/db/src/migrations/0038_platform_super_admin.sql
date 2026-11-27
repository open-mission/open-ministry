CREATE TABLE "platform_integration_config" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encrypted_secrets" text,
	"last_health_status" text,
	"last_health_latency_ms" integer,
	"last_health_checked_at" timestamp,
	"last_health_error" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "platform_integration_config" ADD CONSTRAINT "platform_integration_config_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_integration_provider_uidx" ON "platform_integration_config" USING btree ("provider");--> statement-breakpoint
CREATE TABLE "platform_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"features_json" jsonb DEFAULT '{"whatsapp_notifications":false,"whatsapp_max_instances":0}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "platform_plan_slug_uidx" ON "platform_plan" USING btree ("slug");--> statement-breakpoint
CREATE TABLE "organization_platform_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"plan_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"feature_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "organization_platform_settings" ADD CONSTRAINT "organization_platform_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_platform_settings" ADD CONSTRAINT "organization_platform_settings_plan_id_platform_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_platform_settings" ADD CONSTRAINT "organization_platform_settings_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_platform_settings_plan_idx" ON "organization_platform_settings" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "org_platform_settings_status_idx" ON "organization_platform_settings" USING btree ("status");--> statement-breakpoint
CREATE TABLE "platform_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"summary" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_audit_created_at_idx" ON "platform_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_actor_idx" ON "platform_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_target_idx" ON "platform_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "instance_token" text;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "connection_status" text DEFAULT 'disconnected' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "connected_phone" text;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "connected_profile_name" text;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "last_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "organization_notification_channel" ADD COLUMN "managed_by_platform" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- RLS default-deny: tabelas internas da plataforma e auditoria não têm
-- GRANT nem policy para app_authenticated. Só a conexão owner (servidor) lê.
ALTER TABLE public.platform_integration_config ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.platform_plan ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.organization_platform_settings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- organization_notification_channel passa a ser escrita/lida apenas no
-- servidor via conexão owner; revoga o SELECT legado de app_authenticated.
DROP POLICY IF EXISTS org_notif_channel_select_authenticated ON public.organization_notification_channel;--> statement-breakpoint
REVOKE SELECT ON public.organization_notification_channel FROM app_authenticated;--> statement-breakpoint
-- Seed idempotente dos planos iniciais.
INSERT INTO "platform_plan" ("id","slug","name","description","features_json","is_active","is_default","sort_order","created_at","updated_at") VALUES ('plan_free','free','Gratuito','Recursos básicos para começar.','{"whatsapp_notifications":false,"whatsapp_max_instances":0}'::jsonb,true,true,0,now(),now()),('plan_pro','pro','Pro','Notificações e integrações para igrejas em crescimento.','{"whatsapp_notifications":true,"whatsapp_max_instances":1}'::jsonb,true,false,10,now(),now()) ON CONFLICT ("slug") DO NOTHING;