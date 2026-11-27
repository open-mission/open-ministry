import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { decryptSecret } from "@/lib/secret-crypto";
import { parseEvolutionApiUrl } from "@/lib/evolution-api";

/**
 * Precedência das integrações globais da plataforma:
 *
 *   1. `.env` é a fonte primária: com as credenciais mínimas presentes, o
 *      provedor já opera sem nada salvo no banco (`source: "env"`).
 *   2. Um toggle global salvo no banco (`isEnabled: false`) SEMPRE desliga o
 *      provedor, mesmo com `.env` preenchido.
 *   3. Customização manual (`configJson.source === "platform"`) sobrescreve o
 *      `.env`. Se um segredo foi deixado vazio, usa o segredo salvo no banco ou,
 *      na ausência dele, o segredo do `.env` apenas em memória.
 *
 * REGRA DE CACHE: o `remember()` guarda SOMENTE a linha do banco com
 * `encryptedSecrets` ainda cifrado. Nenhum valor de `process.env` e nenhum
 * segredo descriptografado entra no cache L2/Redis. Leitura de env e
 * descriptografia acontecem fora do `remember()`, apenas em memória.
 */

export type IntegrationSource = "env" | "platform" | "unconfigured";

export type CachedIntegrationRow = {
  id: string;
  provider: string;
  displayName: string;
  isEnabled: boolean;
  configJson: Record<string, unknown>;
  encryptedSecrets: string | null;
  lastHealthStatus: string | null;
  lastHealthLatencyMs: number | null;
  lastHealthCheckedAt: Date | null;
  lastHealthError: string | null;
};

export type IntegrationValues = {
  source: IntegrationSource;
  isEnabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, string | null>;
  hasEnvFallback: boolean;
  hasSecret: boolean;
};

export type PlatformIntegrationResolution = IntegrationValues & {
  provider: string;
  displayName: string;
  secretMasks: Record<string, string | null>;
  maskedSecret: string | null;
  row: CachedIntegrationRow | null;
};

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function maskSecret(secret: string | null): string | null {
  if (!secret) return null;
  return `••••${secret.slice(-4)}`;
}

/** Busca no banco apenas metadados e segredos ainda cifrados. */
export async function getCachedPlatformIntegration(
  provider: string,
): Promise<CachedIntegrationRow | null> {
  return remember<CachedIntegrationRow | null>(
    `platform:integration:${provider}:v2`,
    120,
    async () => {
      const row = await db.query.platformIntegrationConfig.findFirst({
        where: eq(schema.platformIntegrationConfig.provider, provider),
      });
      if (!row) return null;
      return {
        id: row.id,
        provider: row.provider,
        displayName: row.displayName,
        isEnabled: row.isEnabled,
        configJson: (row.configJson ?? {}) as Record<string, unknown>,
        encryptedSecrets: row.encryptedSecrets,
        lastHealthStatus: row.lastHealthStatus,
        lastHealthLatencyMs: row.lastHealthLatencyMs,
        lastHealthCheckedAt: row.lastHealthCheckedAt,
        lastHealthError: row.lastHealthError,
      };
    },
    ["platform:integrations"],
  );
}

/** Descriptografa FORA do cache. Aceita JSON de múltiplos segredos e o formato legado de string simples. */
export function parseEncryptedSecrets(
  encrypted: string | null | undefined,
  legacySecretKey?: string,
): Record<string, string | null> {
  if (!encrypted) return {};
  const plain = decryptSecret(encrypted);
  if (!plain) return {};
  try {
    const parsed: unknown = JSON.parse(plain);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | null>;
    }
  } catch {
    // Formato legado: chave global da Evolution salva como string simples.
  }
  return legacySecretKey ? { [legacySecretKey]: plain } : {};
}

/** Função pura de precedência — testável sem mocks de DB/cache/env. */
export function resolveIntegrationValues(params: {
  row: CachedIntegrationRow | null;
  dbSecrets: Record<string, string | null>;
  envConfig: Record<string, unknown>;
  envSecrets: Record<string, string | null>;
}): IntegrationValues {
  const { row, dbSecrets, envConfig, envSecrets } = params;
  const custom = row?.configJson?.source === "platform";

  const dbConfig = { ...(row?.configJson ?? {}) };
  delete dbConfig.source;

  const hasEnvFallback = Object.values(envSecrets).some(hasValue);
  const envConfigured = Object.values(envConfig).some(hasValue);
  const dbConfigured =
    Object.values(dbConfig).some(hasValue) ||
    Object.values(dbSecrets).some(hasValue);

  // Customização sobrescreve o .env; na ausência de valor salvo, mantém o
  // segredo do banco e, por último, faz fallback em memória para o .env.
  const config = custom ? { ...envConfig, ...dbConfig } : envConfig;

  const secrets: Record<string, string | null> = {};
  for (const key of new Set([...Object.keys(envSecrets), ...Object.keys(dbSecrets)])) {
    const fromDb = dbSecrets[key];
    const fromEnv = envSecrets[key];
    secrets[key] = custom
      ? hasValue(fromDb)
        ? fromDb
        : fromEnv ?? null
      : hasValue(fromEnv)
        ? fromEnv
        : fromDb ?? null;
  }

  let source: IntegrationSource;
  if (custom) source = "platform";
  else if (hasEnvFallback && envConfigured) source = "env";
  else if (dbConfigured) source = "platform";
  else source = "unconfigured";

  // Toggle global no banco é soberano; sem linha, um provedor com credenciais
  // mínimas no .env já nasce habilitado.
  const isEnabled = row
    ? row.isEnabled !== false
    : source !== "unconfigured";

  return {
    source,
    isEnabled,
    config,
    secrets,
    hasEnvFallback,
    hasSecret: Object.values(secrets).some(hasValue),
  };
}

export async function resolvePlatformIntegration(params: {
  provider: string;
  displayName: string;
  envConfig: Record<string, unknown>;
  envSecrets: Record<string, string | null>;
  legacySecretKey?: string;
}): Promise<PlatformIntegrationResolution> {
  const row = await getCachedPlatformIntegration(params.provider);
  const dbSecrets = parseEncryptedSecrets(
    row?.encryptedSecrets ?? null,
    params.legacySecretKey,
  );
  const values = resolveIntegrationValues({
    row,
    dbSecrets,
    envConfig: params.envConfig,
    envSecrets: params.envSecrets,
  });

  const secretMasks: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(values.secrets)) {
    secretMasks[key] = maskSecret(value);
  }

  return {
    ...values,
    provider: params.provider,
    displayName: row?.displayName ?? params.displayName,
    secretMasks,
    maskedSecret:
      maskSecret(Object.values(values.secrets).find(hasValue) ?? null),
    row,
  };
}

export const EVOLUTION_ENV_CONFIG = () => ({
  apiUrl: readEnv("EVOLUTION_API_URL", "EVOLUTION_URL"),
});

export const EVOLUTION_ENV_SECRETS = () => ({
  globalApiKey: readEnv("EVOLUTION_GLOBAL_API_KEY", "EVOLUTION_API_KEY"),
});

export const BREVO_ENV_CONFIG = () => ({
  senderEmail:
    readEnv("BREVO_SENDER_EMAIL", "EMAIL_FROM") ||
    "notificacoes@openministry.app",
  senderName: readEnv("BREVO_SENDER_NAME") || "OpenMinistry",
});

export const BREVO_ENV_SECRETS = () => ({
  apiKey: readEnv("BREVO_API_KEY", "BREVO_API"),
});

export const WEB_PUSH_ENV_CONFIG = () => ({
  vapidPublicKey: readEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PUBLIC_KEY"),
  vapidSubject: readEnv("VAPID_SUBJECT") || "mailto:suporte@openministry.app",
  oneSignalAppId: readEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "ONESIGNAL_APP_ID"),
});

export const WEB_PUSH_ENV_SECRETS = () => ({
  vapidPrivateKey: readEnv("VAPID_PRIVATE_KEY"),
  oneSignalRestApiKey: readEnv("ONESIGNAL_REST_API_KEY"),
});

export type PlatformEvolutionConfig = {
  apiUrl: string;
  globalApiKey: string;
  provider: string;
};

/** Mantém a assinatura histórica usada por notificações, church-whatsapp e entitlements. */
export async function getPlatformEvolutionConfig(): Promise<PlatformEvolutionConfig | null> {
  const resolved = await resolvePlatformIntegration({
    provider: "evolution_whatsapp",
    displayName: "Evolution API Go (Evogo)",
    envConfig: EVOLUTION_ENV_CONFIG(),
    envSecrets: EVOLUTION_ENV_SECRETS(),
    legacySecretKey: "globalApiKey",
  });

  if (!resolved.isEnabled) return null;
  const rawUrl = resolved.config.apiUrl;
  const apiUrl =
    typeof rawUrl === "string" ? parseEvolutionApiUrl(rawUrl) : null;
  const globalApiKey = resolved.secrets.globalApiKey;
  if (!apiUrl || !globalApiKey) return null;

  return { apiUrl, globalApiKey, provider: "evolution_whatsapp" };
}

export type PlatformBrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  source: IntegrationSource;
  isEnabled: boolean;
  hasEnvFallback: boolean;
};

export async function getPlatformBrevoConfig(): Promise<PlatformBrevoConfig> {
  const resolved = await resolvePlatformIntegration({
    provider: "brevo_email",
    displayName: "Brevo (E-mail)",
    envConfig: BREVO_ENV_CONFIG(),
    envSecrets: BREVO_ENV_SECRETS(),
  });

  return {
    apiKey: resolved.secrets.apiKey ?? "",
    senderEmail:
      typeof resolved.config.senderEmail === "string" &&
      resolved.config.senderEmail.trim()
        ? resolved.config.senderEmail
        : "notificacoes@openministry.app",
    senderName:
      typeof resolved.config.senderName === "string" &&
      resolved.config.senderName.trim()
        ? resolved.config.senderName
        : "OpenMinistry",
    source: resolved.source,
    isEnabled: resolved.isEnabled,
    hasEnvFallback: resolved.hasEnvFallback,
  };
}

export type PlatformWebPushConfig = {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  oneSignalAppId: string;
  oneSignalRestApiKey: string;
  source: IntegrationSource;
  isEnabled: boolean;
  hasEnvFallback: boolean;
};

export async function getPlatformWebPushConfig(): Promise<PlatformWebPushConfig> {
  const resolved = await resolvePlatformIntegration({
    provider: "web_push",
    displayName: "Web Push (VAPID / OneSignal)",
    envConfig: WEB_PUSH_ENV_CONFIG(),
    envSecrets: WEB_PUSH_ENV_SECRETS(),
  });

  const asString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  return {
    vapidPublicKey: asString(resolved.config.vapidPublicKey),
    vapidPrivateKey: resolved.secrets.vapidPrivateKey ?? "",
    vapidSubject:
      asString(resolved.config.vapidSubject) ||
      "mailto:suporte@openministry.app",
    oneSignalAppId: asString(resolved.config.oneSignalAppId),
    oneSignalRestApiKey: resolved.secrets.oneSignalRestApiKey ?? "",
    source: resolved.source,
    isEnabled: resolved.isEnabled,
    hasEnvFallback: resolved.hasEnvFallback,
  };
}

/** Todos os provedores já resolvidos (.env + banco), sem exigir sessão. */
export async function listResolvedPlatformIntegrations(): Promise<
  PlatformIntegrationResolution[]
> {
  return Promise.all([
    resolvePlatformIntegration({
      provider: "evolution_whatsapp",
      displayName: "Evolution API Go (Evogo)",
      envConfig: EVOLUTION_ENV_CONFIG(),
      envSecrets: EVOLUTION_ENV_SECRETS(),
      legacySecretKey: "globalApiKey",
    }),
    resolvePlatformIntegration({
      provider: "brevo_email",
      displayName: "Brevo (E-mail)",
      envConfig: BREVO_ENV_CONFIG(),
      envSecrets: BREVO_ENV_SECRETS(),
    }),
    resolvePlatformIntegration({
      provider: "web_push",
      displayName: "Web Push (VAPID / OneSignal)",
      envConfig: WEB_PUSH_ENV_CONFIG(),
      envSecrets: WEB_PUSH_ENV_SECRETS(),
    }),
    resolvePlatformIntegration({
      provider: "meta_whatsapp_cloud",
      displayName: "WhatsApp Oficial (Meta Cloud)",
      envConfig: {},
      envSecrets: {},
    }),
  ]);
}
