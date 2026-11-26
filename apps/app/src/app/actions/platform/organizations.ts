"use server";

import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { getPlatformEvolutionConfig } from "@/lib/platform/evolution-config";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { deleteEvolutionInstance } from "@/lib/evolution-api";
import { decryptSecret } from "@/lib/secret-crypto";
import { recordPlatformAudit } from "@/lib/platform/audit";
import { listResolvedPlatformIntegrations } from "@/lib/platform/integrations-config";

const organizationIdSchema = z.string().trim().min(1, "Igreja inválida.");

const updateOrganizationSchema = z.object({
  organizationId: organizationIdSchema,
  status: z.enum(["active", "trial", "suspended"]).optional(),
  planId: organizationIdSchema.nullable().optional(),
  featureOverrides: z
    .object({
      whatsapp_notifications: z.boolean().optional(),
      whatsapp_max_instances: z.number().int().min(0).max(1000).optional(),
    })
    .strict()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type PlatformOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  plan: { id: string; slug: string; name: string } | null;
  whatsapp: {
    enabled: boolean;
    connectionStatus: string;
    connectedPhone: string | null;
    hasInstance: boolean;
  };
  membersCount: number;
  createdAt: Date;
};

async function loadOrganizationData() {
  const organizations = await db.query.organization.findMany({
    orderBy: [desc(schema.organization.createdAt)],
    limit: 500,
  });
  const organizationIds = organizations.map((organization) => organization.id);

  // As tabelas relacionadas são buscadas apenas para as organizações que
  // realmente serão exibidas, em vez de varrer o banco inteiro.
  const [settings, plans, channels, memberCounts] = await Promise.all([
    organizationIds.length > 0
      ? db.query.organizationPlatformSettings.findMany({
          where: inArray(
            schema.organizationPlatformSettings.organizationId,
            organizationIds,
          ),
        })
      : [],
    db.query.platformPlan.findMany(),
    organizationIds.length > 0
      ? db.query.organizationNotificationChannel.findMany({
          where: and(
            eq(
              schema.organizationNotificationChannel.channel,
              "evolution_whatsapp",
            ),
            inArray(
              schema.organizationNotificationChannel.organizationId,
              organizationIds,
            ),
          ),
        })
      : [],
    organizationIds.length > 0
      ? db
          .select({
            organizationId: schema.member.organizationId,
            count: sql<number>`count(*)`,
          })
          .from(schema.member)
          .where(inArray(schema.member.organizationId, organizationIds))
          .groupBy(schema.member.organizationId)
      : [],
  ]);

  const settingsByOrg = new Map(settings.map((item) => [item.organizationId, item]));
  const planById = new Map(plans.map((item) => [item.id, item]));
  const channelByOrg = new Map(channels.map((item) => [item.organizationId, item]));
  const countByOrg = new Map(
    memberCounts.map((item) => [item.organizationId, Number(item.count)]),
  );

  return { organizations, settingsByOrg, planById, channelByOrg, countByOrg };
}

export async function getPlatformOverviewAction(): Promise<{
  organizations: { total: number; active: number; trial: number; suspended: number };
  whatsapp: { enabled: number; connected: number };
  providers: {
    provider: string;
    displayName: string;
    isEnabled: boolean;
    source: "env" | "platform" | "unconfigured";
    lastHealthStatus: string | null;
    lastHealthLatencyMs: number | null;
  }[];
}> {
  const session = await requireSuperAdmin("access");
  const [{ organizations, settingsByOrg, channelByOrg }, integrations] =
    await Promise.all([loadOrganizationData(), listResolvedPlatformIntegrations()]);

  const statuses = organizations.map((org) => settingsByOrg.get(org.id)?.status ?? "active");
  const connected = [...channelByOrg.values()].filter(
    (channel) => channel.connectionStatus === "connected",
  ).length;
  const enabled = [...channelByOrg.values()].filter(
    (channel) => channel.isActive && channel.instanceName,
  ).length;

  void session;
  return {
    organizations: {
      total: organizations.length,
      active: statuses.filter((status) => status === "active").length,
      trial: statuses.filter((status) => status === "trial").length,
      suspended: statuses.filter((status) => status === "suspended").length,
    },
    whatsapp: { enabled, connected },
    providers: integrations.map((item) => ({
      provider: item.provider,
      displayName: item.displayName,
      isEnabled: item.isEnabled,
      source: item.source,
      lastHealthStatus: item.row?.lastHealthStatus ?? null,
      lastHealthLatencyMs: item.row?.lastHealthLatencyMs ?? null,
    })),
  };
}

export async function listPlatformOrganizationsAction(options?: {
  search?: string;
  status?: string;
  planId?: string;
  whatsapp?: "all" | "enabled" | "connected";
  limit?: number;
  offset?: number;
}): Promise<{ organizations: PlatformOrganizationRow[]; total: number }> {
  await requireSuperAdmin("access");
  const { organizations, settingsByOrg, planById, channelByOrg, countByOrg } =
    await loadOrganizationData();

  const search = options?.search?.trim().toLowerCase();
  let rows = organizations
    .filter((org) => !search || org.name.toLowerCase().includes(search) || org.slug.includes(search))
    .filter((org) => !options?.status || (settingsByOrg.get(org.id)?.status ?? "active") === options.status)
    .filter((org) => !options?.planId || settingsByOrg.get(org.id)?.planId === options.planId)
    .filter((org) => {
      if (!options?.whatsapp || options.whatsapp === "all") return true;
      const channel = channelByOrg.get(org.id);
      if (options.whatsapp === "connected") return channel?.connectionStatus === "connected";
      return Boolean(channel?.isActive && channel.instanceName);
    });

  const total = rows.length;
  rows = rows.slice(options?.offset ?? 0, (options?.offset ?? 0) + Math.min(options?.limit ?? 50, 100));

  return {
    total,
    organizations: rows.map((org) => {
      const settings = settingsByOrg.get(org.id);
      const plan = settings?.planId ? planById.get(settings.planId) : null;
      const channel = channelByOrg.get(org.id);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        status: settings?.status ?? "active",
        plan: plan ? { id: plan.id, slug: plan.slug, name: plan.name } : null,
        whatsapp: {
          enabled: Boolean(channel?.isActive && channel.instanceName),
          connectionStatus: channel?.connectionStatus ?? "disconnected",
          connectedPhone: channel?.connectedPhone ?? null,
          hasInstance: Boolean(channel?.instanceName),
        },
        membersCount: countByOrg.get(org.id) ?? 0,
        createdAt: org.createdAt,
      };
    }),
  };
}

export async function getPlatformOrganizationAction(organizationId: string): Promise<{
  organization: PlatformOrganizationRow | null;
  settings: {
    status: string;
    planId: string | null;
    featureOverrides: Record<string, unknown>;
    notes: string | null;
  } | null;
  channel: {
    instanceName: string | null;
    connectionStatus: string;
    connectedPhone: string | null;
    connectedProfileName: string | null;
    lastConnectedAt: Date | null;
    lastError: string | null;
  } | null;
}> {
  await requireSuperAdmin("manage-organizations");
  const { organizations, settingsByOrg, planById, channelByOrg, countByOrg } =
    await loadOrganizationData();
  const org = organizations.find((item) => item.id === organizationId);
  if (!org) return { organization: null, settings: null, channel: null };

  const settings = settingsByOrg.get(org.id);
  const plan = settings?.planId ? planById.get(settings.planId) : null;
  const channel = channelByOrg.get(org.id);

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      status: settings?.status ?? "active",
      plan: plan ? { id: plan.id, slug: plan.slug, name: plan.name } : null,
      whatsapp: {
        enabled: Boolean(channel?.isActive && channel.instanceName),
        connectionStatus: channel?.connectionStatus ?? "disconnected",
        connectedPhone: channel?.connectedPhone ?? null,
        hasInstance: Boolean(channel?.instanceName),
      },
      membersCount: countByOrg.get(org.id) ?? 0,
      createdAt: org.createdAt,
    },
    settings: settings
      ? {
          status: settings.status,
          planId: settings.planId,
          featureOverrides: settings.featureOverrides as Record<string, unknown>,
          notes: settings.notes,
        }
      : null,
    channel: channel
      ? {
          instanceName: channel.instanceName,
          connectionStatus: channel.connectionStatus,
          connectedPhone: channel.connectedPhone,
          connectedProfileName: channel.connectedProfileName,
          lastConnectedAt: channel.lastConnectedAt,
          lastError: channel.lastError,
        }
      : null,
  };
}

export async function updatePlatformOrganizationAction(input: {
  organizationId: string;
  status?: "active" | "trial" | "suspended";
  planId?: string | null;
  featureOverrides?: Record<string, unknown>;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-organizations");
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos: verifique os campos enviados." };
  }
  const data = parsed.data;
  if (data.planId) {
    const plan = await db.query.platformPlan.findFirst({
      where: eq(schema.platformPlan.id, data.planId),
    });
    if (!plan) return { ok: false, error: "Plano inexistente." };
  }

  const existing = await db.query.organizationPlatformSettings.findFirst({
    where: eq(schema.organizationPlatformSettings.organizationId, data.organizationId),
  });

  const values = {
    ...(data.status ? { status: data.status } : {}),
    ...(data.planId !== undefined ? { planId: data.planId } : {}),
    ...(data.featureOverrides !== undefined ? { featureOverrides: data.featureOverrides } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    updatedByUserId: session.user.id,
  };

  if (existing) {
    await db
      .update(schema.organizationPlatformSettings)
      .set(values)
      .where(eq(schema.organizationPlatformSettings.organizationId, data.organizationId));
  } else {
    await db.insert(schema.organizationPlatformSettings).values({
      organizationId: data.organizationId,
      status: data.status ?? "active",
      planId: data.planId ?? null,
      featureOverrides: data.featureOverrides ?? {},
      notes: data.notes ?? null,
      updatedByUserId: session.user.id,
    });
  }

  await invalidateOrganizationEntitlements(data.organizationId);
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "organization.settings_updated",
    targetType: "organization",
    targetId: data.organizationId,
    summary: "Configurações de plataforma da igreja atualizadas.",
    metadataJson: { ...values, notes: undefined },
  });

  return { ok: true };
}

export async function revokeOrganizationInstanceAction(
  organizationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-organizations");
  const parsedId = organizationIdSchema.safeParse(organizationId);
  if (!parsedId.success) return { ok: false, error: "Igreja inválida." };
  const organizationIdValue = parsedId.data;
  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, organizationIdValue),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });
  if (!channel?.instanceName) return { ok: false, error: "Igreja sem instância conectada." };

  let remoteError: string | undefined;
  const platformConfig = await getPlatformEvolutionConfig();
  if (platformConfig && channel.instanceToken) {
    const result = await deleteEvolutionInstance({
      apiUrl: platformConfig.apiUrl,
      globalApiKey: platformConfig.globalApiKey,
      instanceToken: decryptSecret(channel.instanceToken) ?? "",
      instanceName: channel.instanceName,
    });
    remoteError = result.error;
  }

  await db
    .update(schema.organizationNotificationChannel)
    .set({
      instanceName: null,
      instanceToken: null,
      connectionStatus: "disconnected",
      connectedPhone: null,
      connectedProfileName: null,
      lastConnectedAt: null,
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(schema.organizationNotificationChannel.id, channel.id));

  await invalidateOrganizationEntitlements(organizationIdValue);
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "organization.instance_revoked",
    targetType: "organization",
    targetId: organizationIdValue,
    summary: "Instância de WhatsApp da igreja revogada pelo Super Admin.",
    metadataJson: remoteError ? { remoteError } : {},
  });

  return { ok: true, error: remoteError };
}
