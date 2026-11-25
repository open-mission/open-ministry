"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { setVapidDetails } from "web-push";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { encryptSecret } from "@/lib/secret-crypto";
import {
  checkEvolutionPlatformHealth,
  assertEvolutionUrlResolvedSafe,
  parseEvolutionApiUrl,
} from "@/lib/evolution-api";
import { recordPlatformAudit } from "@/lib/platform/audit";
import {
  listResolvedPlatformIntegrations,
  getPlatformEvolutionConfig,
  getPlatformBrevoConfig,
  getPlatformWebPushConfig,
  EVOLUTION_ENV_SECRETS,
  BREVO_ENV_SECRETS,
  WEB_PUSH_ENV_SECRETS,
  parseEncryptedSecrets,
  type IntegrationSource,
  type PlatformIntegrationResolution,
} from "@/lib/platform/integrations-config";

export type PlatformIntegrationView = {
  provider: string;
  displayName: string;
  source: IntegrationSource;
  hasEnvFallback: boolean;
  isEnabled: boolean;
  /** Somente campos não sensíveis efetivos. */
  config: Record<string, unknown>;
  hasSecret: boolean;
  maskedSecret: string | null;
  /** Máscaras por segredo — nunca o valor em claro. */
  secretMasks: Record<string, string | null>;
  lastHealthStatus: string | null;
  lastHealthLatencyMs: number | null;
  lastHealthCheckedAt: Date | null;
  lastHealthError: string | null;
};

const PUBLIC_CONFIG_KEYS = [
  "apiUrl",
  "senderEmail",
  "senderName",
  "vapidPublicKey",
  "vapidSubject",
  "oneSignalAppId",
] as const;

const PROVIDERS = [
  "evolution_whatsapp",
  "brevo_email",
  "web_push",
  "meta_whatsapp_cloud",
] as const;

const DISPLAY_NAMES: Record<string, string> = {
  evolution_whatsapp: "Evolution API Go (Evogo)",
  brevo_email: "Brevo (E-mail)",
  web_push: "Web Push (VAPID / OneSignal)",
  meta_whatsapp_cloud: "WhatsApp Oficial (Meta Cloud)",
};

const providerSchema = z.enum(PROVIDERS);

function publicConfig(resolved: PlatformIntegrationResolution) {
  const config: Record<string, unknown> = {};
  for (const key of PUBLIC_CONFIG_KEYS) {
    if (resolved.config[key] !== undefined) config[key] = resolved.config[key];
  }
  return config;
}

function toView(resolved: PlatformIntegrationResolution): PlatformIntegrationView {
  return {
    provider: resolved.provider,
    displayName: resolved.displayName,
    source: resolved.source,
    hasEnvFallback: resolved.hasEnvFallback,
    isEnabled: resolved.isEnabled,
    config: publicConfig(resolved),
    hasSecret: resolved.hasSecret,
    maskedSecret: resolved.maskedSecret,
    secretMasks: resolved.secretMasks,
    lastHealthStatus: resolved.row?.lastHealthStatus ?? null,
    lastHealthLatencyMs: resolved.row?.lastHealthLatencyMs ?? null,
    lastHealthCheckedAt: resolved.row?.lastHealthCheckedAt ?? null,
    lastHealthError: resolved.row?.lastHealthError ?? null,
  };
}

async function findIntegration(provider: string) {
  return db.query.platformIntegrationConfig.findFirst({
    where: eq(schema.platformIntegrationConfig.provider, provider),
  });
}

async function upsertIntegration(
  provider: string,
  values: Record<string, unknown>,
): Promise<string> {
  const existing = await findIntegration(provider);
  if (existing) {
    await db
      .update(schema.platformIntegrationConfig)
      .set(values)
      .where(eq(schema.platformIntegrationConfig.id, existing.id));
    return existing.id;
  }

  const id = randomUUID();
  await db.insert(schema.platformIntegrationConfig).values({
    id,
    provider,
    displayName: DISPLAY_NAMES[provider] ?? provider,
    isEnabled: true,
    configJson: {},
    encryptedSecrets: null,
    ...values,
  });
  return id;
}

/** Grava apenas metadados de saúde — nunca copia chaves do .env para o banco. */
async function saveHealthMetadata(
  provider: string,
  health: {
    status: string;
    latencyMs: number | null;
    error?: string | null;
  },
): Promise<void> {
  const values = {
    lastHealthStatus: health.status,
    lastHealthLatencyMs: health.latencyMs,
    lastHealthCheckedAt: new Date(),
    lastHealthError: health.error ?? null,
  };
  const existing = await findIntegration(provider);
  if (existing) {
    await db
      .update(schema.platformIntegrationConfig)
      .set(values)
      .where(eq(schema.platformIntegrationConfig.id, existing.id));
    return;
  }

  await db.insert(schema.platformIntegrationConfig).values({
    id: randomUUID(),
    provider,
    displayName: DISPLAY_NAMES[provider] ?? provider,
    isEnabled: true,
    configJson: { source: "env" },
    encryptedSecrets: null,
    ...values,
  });
}

export async function listPlatformIntegrationsAction(): Promise<
  PlatformIntegrationView[]
> {
  await requireSuperAdmin("manage-integrations");
  const resolved = await listResolvedPlatformIntegrations();
  return resolved.map(toView);
}

/** Restaura o padrão do .env, removendo a customização salva no painel. */
export async function resetPlatformIntegrationToEnvAction(
  provider: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-integrations");
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { ok: false, error: "Provedor inválido." };

  const id = await upsertIntegration(
    parsed.data,
    {
      configJson: { source: "env" },
      encryptedSecrets: null,
      isEnabled: true,
      updatedByUserId: session.user.id,
      updatedAt: new Date(),
    },
  );

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.reset_to_env",
    targetType: "platform_integration_config",
    targetId: id,
    summary: `${DISPLAY_NAMES[parsed.data]} restaurado para o padrão do .env.`,
  });

  return { ok: true };
}

const evolutionSaveSchema = z
  .object({
    apiUrl: z.string().trim().min(1, "Informe a URL da API."),
    globalApiKey: z.string().optional(),
    isEnabled: z.boolean(),
  })
  .strict();

export async function saveEvolutionPlatformIntegrationAction(input: {
  apiUrl: string;
  globalApiKey?: string;
  isEnabled: boolean;
}): Promise<{
  ok: boolean;
  error?: string;
  health?: { ok: boolean; latencyMs: number | null };
}> {
  const session = await requireSuperAdmin("manage-integrations");
  const parsed = evolutionSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const apiUrl = parseEvolutionApiUrl(parsed.data.apiUrl);
  if (!apiUrl || !(await assertEvolutionUrlResolvedSafe(new URL(apiUrl)))) {
    return {
      ok: false,
      error: "Informe uma URL http(s) pública válida (hosts internos não são permitidos).",
    };
  }

  const existing = await findIntegration("evolution_whatsapp");
  const providedKey = parsed.data.globalApiKey?.trim();
  const existingSecrets = parseEncryptedSecrets(
    existing?.encryptedSecrets ?? null,
    "globalApiKey",
  );
  const effectiveKey =
    providedKey || existingSecrets.globalApiKey || EVOLUTION_ENV_SECRETS().globalApiKey;
  if (!effectiveKey) return { ok: false, error: "Informe a Global API Key." };

  const encryptedSecrets = providedKey
    ? encryptSecret(providedKey)
    : existing?.encryptedSecrets ?? null;

  await upsertIntegration(
    "evolution_whatsapp",
    {
      configJson: { apiUrl, source: "platform" },
      encryptedSecrets,
      isEnabled: parsed.data.isEnabled,
      updatedByUserId: session.user.id,
      updatedAt: new Date(),
    },
  );

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.evolution_saved",
    targetType: "platform_integration_config",
    targetId: existing?.id ?? "evolution_whatsapp",
    summary: "Configuração global da Evolution Go atualizada.",
    metadataJson: { isEnabled: parsed.data.isEnabled },
  });

  const result = await checkEvolutionPlatformHealth({
    apiUrl,
    globalApiKey: effectiveKey,
  });
  await saveHealthMetadata("evolution_whatsapp", {
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error ?? null,
  });

  return {
    ok: true,
    health: { ok: result.ok, latencyMs: result.latencyMs },
  };
}

export async function testEvolutionPlatformIntegrationAction(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  instanceCount: number;
  error?: string;
}> {
  const session = await requireSuperAdmin("manage-integrations");
  const config = await getPlatformEvolutionConfig();
  if (!config) {
    return {
      ok: false,
      latencyMs: null,
      instanceCount: 0,
      error: "Integração não configurada.",
    };
  }

  const result = await checkEvolutionPlatformHealth(config);
  await saveHealthMetadata("evolution_whatsapp", {
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error ?? null,
  });
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.evolution_tested",
    targetType: "platform_integration_config",
    targetId: "evolution_whatsapp",
    summary: `Teste de saúde da Evolution: ${result.status}.`,
  });

  return {
    ok: result.ok,
    latencyMs: result.latencyMs,
    instanceCount: result.instanceCount,
    error: result.error,
  };
}

const brevoSaveSchema = z
  .object({
    senderEmail: z.string().trim().email("Informe um e-mail válido."),
    senderName: z.string().trim().min(1).max(80),
    apiKey: z.string().optional(),
    isEnabled: z.boolean(),
  })
  .strict();

export async function saveBrevoPlatformIntegrationAction(input: {
  senderEmail: string;
  senderName: string;
  apiKey?: string;
  isEnabled: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-integrations");
  const parsed = brevoSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const existing = await findIntegration("brevo_email");
  const providedKey = parsed.data.apiKey?.trim();
  const existingSecrets = parseEncryptedSecrets(existing?.encryptedSecrets ?? null);
  const effectiveKey = providedKey || existingSecrets.apiKey || BREVO_ENV_SECRETS().apiKey;
  if (!effectiveKey) return { ok: false, error: "Informe a API Key do Brevo." };

  const encryptedSecrets = providedKey
    ? encryptSecret(JSON.stringify({ apiKey: providedKey }))
    : existing?.encryptedSecrets ?? null;

  await upsertIntegration(
    "brevo_email",
    {
      configJson: {
        senderEmail: parsed.data.senderEmail,
        senderName: parsed.data.senderName,
        source: "platform",
      },
      encryptedSecrets,
      isEnabled: parsed.data.isEnabled,
      updatedByUserId: session.user.id,
      updatedAt: new Date(),
    },
  );

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.brevo_saved",
    targetType: "platform_integration_config",
    targetId: existing?.id ?? "brevo_email",
    summary: "Configuração global do Brevo atualizada.",
    metadataJson: {
      isEnabled: parsed.data.isEnabled,
      senderEmail: parsed.data.senderEmail,
    },
  });

  return { ok: true };
}

export async function testBrevoPlatformIntegrationAction(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}> {
  const session = await requireSuperAdmin("manage-integrations");
  const config = await getPlatformBrevoConfig();
  if (!config.isEnabled) {
    return {
      ok: false,
      latencyMs: null,
      error: "Integração de e-mail Brevo desativada pela plataforma.",
    };
  }
  if (!config.apiKey) {
    return { ok: false, latencyMs: null, error: "Integração não configurada." };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: { "api-key": config.apiKey, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      console.error("[Brevo] Falha ao testar conexão", { status: response.status });
      await saveHealthMetadata("brevo_email", {
        status: `http_${response.status}`,
        latencyMs,
        error: `HTTP ${response.status}`,
      });
      return {
        ok: false,
        latencyMs,
        error: `Falha na API Brevo (HTTP ${response.status}).`,
      };
    }

    await saveHealthMetadata("brevo_email", {
      status: "healthy",
      latencyMs,
      error: null,
    });
    await recordPlatformAudit({
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "integration.brevo_tested",
      targetType: "platform_integration_config",
      targetId: "brevo_email",
      summary: "Teste de conexão do Brevo concluído.",
    });
    return { ok: true, latencyMs };
  } catch (error) {
    console.error("[Brevo] Exceção ao testar conexão:", error);
    const latencyMs = Date.now() - startedAt;
    await saveHealthMetadata("brevo_email", {
      status: "unreachable",
      latencyMs,
      error: "connection_error",
    });
    return {
      ok: false,
      latencyMs,
      error: "Não foi possível conectar ao Brevo. Tente novamente.",
    };
  }
}

const webPushSaveSchema = z
  .object({
    vapidPublicKey: z.string().trim().min(1),
    vapidPrivateKey: z.string().optional(),
    vapidSubject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .default("mailto:suporte@openministry.app"),
    oneSignalAppId: z.string().optional(),
    oneSignalRestApiKey: z.string().optional(),
    isEnabled: z.boolean(),
  })
  .strict();

export async function saveWebPushPlatformIntegrationAction(input: {
  vapidPublicKey: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  oneSignalAppId?: string;
  oneSignalRestApiKey?: string;
  isEnabled: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-integrations");
  const parsed = webPushSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const existing = await findIntegration("web_push");
  const existingSecrets = parseEncryptedSecrets(existing?.encryptedSecrets ?? null);
  const envSecrets = WEB_PUSH_ENV_SECRETS();
  const privateKey =
    parsed.data.vapidPrivateKey?.trim() ||
    existingSecrets.vapidPrivateKey ||
    envSecrets.vapidPrivateKey;
  const oneSignalKey =
    parsed.data.oneSignalRestApiKey?.trim() ||
    existingSecrets.oneSignalRestApiKey ||
    envSecrets.oneSignalRestApiKey;
  if (!privateKey) return { ok: false, error: "Informe a chave privada VAPID." };

  const hasNewSecret = Boolean(
    parsed.data.vapidPrivateKey?.trim() || parsed.data.oneSignalRestApiKey?.trim(),
  );
  const encryptedSecrets = hasNewSecret
    ? encryptSecret(JSON.stringify({
        vapidPrivateKey: privateKey,
        oneSignalRestApiKey: oneSignalKey || null,
      }))
    : existing?.encryptedSecrets ?? null;

  await upsertIntegration(
    "web_push",
    {
      configJson: {
        vapidPublicKey: parsed.data.vapidPublicKey,
        vapidSubject: parsed.data.vapidSubject,
        oneSignalAppId: parsed.data.oneSignalAppId?.trim() || undefined,
        source: "platform",
      },
      encryptedSecrets,
      isEnabled: parsed.data.isEnabled,
      updatedByUserId: session.user.id,
      updatedAt: new Date(),
    },
  );

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "integration.web_push_saved",
    targetType: "platform_integration_config",
    targetId: existing?.id ?? "web_push",
    summary: "Configuração global de Web Push atualizada.",
    metadataJson: {
      isEnabled: parsed.data.isEnabled,
      hasOneSignal: Boolean(parsed.data.oneSignalAppId),
    },
  });

  return { ok: true };
}

export async function testWebPushPlatformIntegrationAction(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}> {
  const session = await requireSuperAdmin("manage-integrations");
  const config = await getPlatformWebPushConfig();
  if (!config.isEnabled) {
    return {
      ok: false,
      latencyMs: null,
      error: "Integração de Web Push desativada pela plataforma.",
    };
  }
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    return { ok: false, latencyMs: null, error: "Integração não configurada." };
  }

  const startedAt = Date.now();
  try {
    // Valida as chaves sem disparar push real.
    setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey,
    );

    if (config.oneSignalAppId && config.oneSignalRestApiKey) {
      const response = await fetch(
        `https://onesignal.com/api/v1/apps/${encodeURIComponent(config.oneSignalAppId)}`,
        {
          method: "GET",
          headers: { Authorization: `Basic ${config.oneSignalRestApiKey}` },
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) {
        const latencyMs = Date.now() - startedAt;
        console.error("[OneSignal] Falha ao testar app", {
          status: response.status,
        });
        await saveHealthMetadata("web_push", {
          status: `onesignal_http_${response.status}`,
          latencyMs,
          error: `HTTP ${response.status}`,
        });
        return {
          ok: false,
          latencyMs,
          error: `Falha na API OneSignal (HTTP ${response.status}).`,
        };
      }
    }

    const latencyMs = Date.now() - startedAt;
    await saveHealthMetadata("web_push", {
      status: "healthy",
      latencyMs,
      error: null,
    });
    await recordPlatformAudit({
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "integration.web_push_tested",
      targetType: "platform_integration_config",
      targetId: "web_push",
      summary: "Teste de configuração de Web Push concluído.",
    });
    return { ok: true, latencyMs };
  } catch (error) {
    console.error("[Web Push] Exceção ao testar configuração:", error);
    const latencyMs = Date.now() - startedAt;
    await saveHealthMetadata("web_push", {
      status: "invalid_config",
      latencyMs,
      error: "invalid_vapid",
    });
    return {
      ok: false,
      latencyMs,
      error: "Configuração VAPID inválida. Verifique as chaves.",
    };
  }
}
