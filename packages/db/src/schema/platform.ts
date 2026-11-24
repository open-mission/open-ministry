import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

/**
 * Features controladas por plano/override. `whatsapp_notifications` libera o
 * fluxo gerenciado de WhatsApp na igreja; `whatsapp_max_instances` é o limite
 * de instâncias simultâneas.
 */
export type PlatformFeatureFlags = {
  whatsapp_notifications: boolean;
  whatsapp_max_instances: number;
};

export const DEFAULT_PLATFORM_FEATURES: PlatformFeatureFlags = {
  whatsapp_notifications: false,
  whatsapp_max_instances: 0,
};

export const PLATFORM_PROVIDERS = [
  "evolution_whatsapp",
  "meta_whatsapp_cloud",
  "brevo_email",
  "web_push",
] as const;

export type PlatformProvider = (typeof PLATFORM_PROVIDERS)[number];

/**
 * Configuração global de um provedor da plataforma. Nunca contém
 * `organizationId`: é acessível somente pela conexão owner no servidor.
 */
export const platformIntegrationConfig = pgTable(
  "platform_integration_config",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    isEnabled: boolean("is_enabled").default(false).notNull(),
    configJson: jsonb("config_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    /** AES-256-GCM via encryptSecret(); nunca devolvido ao cliente. */
    encryptedSecrets: text("encrypted_secrets"),
    lastHealthStatus: text("last_health_status"),
    lastHealthLatencyMs: integer("last_health_latency_ms"),
    lastHealthCheckedAt: timestamp("last_health_checked_at"),
    lastHealthError: text("last_health_error"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("platform_integration_provider_uidx").on(table.provider),
  ],
);

export const platformPlan = pgTable(
  "platform_plan",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    featuresJson: jsonb("features_json")
      .$type<PlatformFeatureFlags>()
      .default(DEFAULT_PLATFORM_FEATURES)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("platform_plan_slug_uidx").on(table.slug)],
);

export const organizationPlatformSettings = pgTable(
  "organization_platform_settings",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => platformPlan.id, {
      onDelete: "set null",
    }),
    status: text("status").default("active").notNull(),
    featureOverrides: jsonb("feature_overrides")
      .$type<Partial<PlatformFeatureFlags>>()
      .default({})
      .notNull(),
    /** Notas internas do Super Admin — protegidas por RLS default-deny. */
    notes: text("notes"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_platform_settings_plan_idx").on(table.planId),
    index("org_platform_settings_status_idx").on(table.status),
  ],
);

export const platformAuditLog = pgTable(
  "platform_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("platform_audit_created_at_idx").on(table.createdAt),
    index("platform_audit_actor_idx").on(table.actorUserId),
    index("platform_audit_target_idx").on(table.targetType, table.targetId),
  ],
);

export const organizationPlatformSettingsRelations = relations(
  organizationPlatformSettings,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationPlatformSettings.organizationId],
      references: [organization.id],
    }),
    plan: one(platformPlan, {
      fields: [organizationPlatformSettings.planId],
      references: [platformPlan.id],
    }),
  }),
);
