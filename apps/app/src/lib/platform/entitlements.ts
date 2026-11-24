import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheDelete, cacheInvalidateTags, remember } from "@/lib/cache";
import {
  DEFAULT_PLATFORM_FEATURES,
  type PlatformFeatureFlags,
} from "@openministry/db";

export const PLATFORM_CACHE_TAGS = [
  "platform:entitlements",
  "platform:integrations",
  "platform:plans",
] as const;

export type OrganizationEntitlements = {
  organizationId: string;
  status: string;
  plan: {
    id: string;
    slug: string;
    name: string;
  } | null;
  features: PlatformFeatureFlags;
  /** Configuração global resumida — nunca contém URL nem segredos. */
  integration: {
    provider: string;
    isEnabled: boolean;
    hasSecret: boolean;
    lastHealthStatus: string | null;
  } | null;
  whatsapp: {
    enabled: boolean;
    maxInstances: number;
    providerAvailable: boolean;
  };
};

/**
 * Resolve o que uma igreja pode usar combinando: status da organização, plano,
 * overrides manuais e disponibilidade do provedor global. Nunca devolve
 * segredos ou a URL global da Evolution.
 */
export async function getOrganizationEntitlements(
  organizationId: string,
): Promise<OrganizationEntitlements> {
  return remember(
    `platform:entitlements:${organizationId}`,
    300,
    async () => {
      const [settings, integration] = await Promise.all([
        db.query.organizationPlatformSettings.findFirst({
          where: eq(schema.organizationPlatformSettings.organizationId, organizationId),
        }),
        db.query.platformIntegrationConfig.findFirst({
          where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
        }),
      ]);

      const plan = settings?.planId
        ? await db.query.platformPlan.findFirst({
            where: eq(schema.platformPlan.id, settings.planId),
          })
        : await db.query.platformPlan.findFirst({
            where: eq(schema.platformPlan.isDefault, true),
          });

      const baseFeatures: PlatformFeatureFlags = {
        ...DEFAULT_PLATFORM_FEATURES,
        ...(plan?.featuresJson ?? {}),
      };
      const features: PlatformFeatureFlags = {
        ...baseFeatures,
        ...(settings?.featureOverrides ?? {}),
      };

      const status = settings?.status ?? "active";
      const suspended = status === "suspended";
      const providerAvailable = Boolean(
        integration?.isEnabled && integration?.encryptedSecrets,
      );

      const enabled = !suspended && features.whatsapp_notifications && providerAvailable;

      return {
        organizationId,
        status,
        plan: plan
          ? { id: plan.id, slug: plan.slug, name: plan.name }
          : null,
        features,
        integration: integration
          ? {
              provider: integration.provider,
              isEnabled: integration.isEnabled,
              hasSecret: Boolean(integration.encryptedSecrets),
              lastHealthStatus: integration.lastHealthStatus,
            }
          : null,
        whatsapp: {
          enabled,
          maxInstances: enabled ? features.whatsapp_max_instances : 0,
          providerAvailable,
        },
      } satisfies OrganizationEntitlements;
    },
    [...PLATFORM_CACHE_TAGS],
  );
}

/** Invalida o cache de entitlements de uma igreja após qualquer mutação. */
export async function invalidateOrganizationEntitlements(
  organizationId?: string,
): Promise<void> {
  if (organizationId) {
    await cacheDelete(`platform:entitlements:${organizationId}`);
  }
  await cacheInvalidateTags(...PLATFORM_CACHE_TAGS);
}
