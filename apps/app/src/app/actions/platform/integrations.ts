"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";
import {
  checkEvolutionPlatformHealth,
  assertEvolutionUrlResolvedSafe,
  parseEvolutionApiUrl,
} from "@/lib/evolution-api";
import { recordPlatformAudit } from "@/lib/platform/audit";

export type PlatformIntegrationView = {
  provider: string;
  displayName: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  hasSecret: boolean;
  maskedSecret: string | null;
  lastHealthStatus: string | null;
  lastHealthLatencyMs: number | null;
  lastHealthCheckedAt: Date | null;
  lastHealthError: string | null;
};

function maskSecret(secret: string | null): string | null {
  if (!secret) return null;
  const tail = secret.slice(-4);
  return `••••${tail}`;
}

export async function listPlatformIntegrationsAction(): Promise<
  PlatformIntegrationView[]
> {
  await requireSuperAdmin("manage-integrations");
  const rows = await db.query.platformIntegrationConfig.findMany();
  return rows.map((row) => {
    const plain = decryptSecret(row.encryptedSecrets);
    return {
      provider: row.provider,
      displayName: row.displayName,
      isEnabled: row.isEnabled,
      config: row.configJson as Record<string, unknown>,
      hasSecret: Boolean(plain),
      maskedSecret: maskSecret(plain),
      lastHealthStatus: row.lastHealthStatus,
      lastHealthLatencyMs: row.lastHealthLatencyMs,
      lastHealthCheckedAt: row.lastHealthCheckedAt,
      lastHealthError: row.lastHealthError,
    };
  });
}

export async function saveEvolutionPlatformIntegrationAction(input: {
  apiUrl: string;
  globalApiKey?: string;
  isEnabled: boolean;
}): Promise<{ ok: boolean; error?: string; health?: { ok: boolean; latencyMs: number | null } }> {
  const session = await requireSuperAdmin("manage-integrations");
  const apiUrl = parseEvolutionApiUrl(input.apiUrl);
  if (!apiUrl || !(await assertEvolutionUrlResolvedSafe(new URL(apiUrl)))) {
    return { ok: false, error: "Informe uma URL http(s) pública válida (hosts internos não são permitidos)." };
  }

  const existing = await db.query.platformIntegrationConfig.findFirst({
    where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
  });

  const secret = input.globalApiKey?.trim()
    ? encryptSecret(input.globalApiKey.trim())
    : existing?.encryptedSecrets ?? null;
  if (!secret) return { ok: false, error: "Informe a Global API Key." };

  const values = {
    displayName: existing?.displayName ?? "Evolution API Go (Evogo)",
    isEnabled: input.isEnabled,
    configJson: { apiUrl },
    encryptedSecrets: secret,
    updatedByUserId: session.user.id,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.platformIntegrationConfig)
      .set(values)
      .where(eq(schema.platformIntegrationConfig.id, existing.id));
  } else {
    await db.insert(schema.platformIntegrationConfig).values({
      id: randomUUID(),
      provider: "evolution_whatsapp",
      ...values,
    });
  }

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.evolution_saved",
    targetType: "platform_integration_config",
    targetId: existing?.id ?? "evolution_whatsapp",
    summary: "Configuração global da Evolution Go atualizada.",
    metadataJson: { isEnabled: input.isEnabled },
  });

  const globalApiKey = decryptSecret(secret);
  let health: { ok: boolean; latencyMs: number | null } | undefined;
  if (globalApiKey) {
    const result = await checkEvolutionPlatformHealth({ apiUrl, globalApiKey });
    health = { ok: result.ok, latencyMs: result.latencyMs };
    const saved = await db.query.platformIntegrationConfig.findFirst({
      where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
    });
    if (saved) {
      await db
        .update(schema.platformIntegrationConfig)
        .set({
          lastHealthStatus: result.status,
          lastHealthLatencyMs: result.latencyMs,
          lastHealthCheckedAt: new Date(),
          lastHealthError: result.error ?? null,
        })
        .where(eq(schema.platformIntegrationConfig.id, saved.id));
    }
  }

  return { ok: true, health };
}

export async function testEvolutionPlatformIntegrationAction(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  instanceCount: number;
  error?: string;
}> {
  const session = await requireSuperAdmin("manage-integrations");
  const integration = await db.query.platformIntegrationConfig.findFirst({
    where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
  });
  const apiUrl = (integration?.configJson as { apiUrl?: unknown } | null)?.apiUrl;
  const globalApiKey = decryptSecret(integration?.encryptedSecrets);
  if (typeof apiUrl !== "string" || !globalApiKey) {
    return { ok: false, latencyMs: null, instanceCount: 0, error: "Integração não configurada." };
  }

  const result = await checkEvolutionPlatformHealth({ apiUrl, globalApiKey });
  await db
    .update(schema.platformIntegrationConfig)
    .set({
      lastHealthStatus: result.status,
      lastHealthLatencyMs: result.latencyMs,
      lastHealthCheckedAt: new Date(),
      lastHealthError: result.error ?? null,
    })
    .where(eq(schema.platformIntegrationConfig.id, integration!.id));

  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.evolution_tested",
    targetType: "platform_integration_config",
    targetId: integration!.id,
    summary: `Teste de saúde da Evolution: ${result.status}.`,
  });

  return {
    ok: result.ok,
    latencyMs: result.latencyMs,
    instanceCount: result.instanceCount,
    error: result.error,
  };
}
