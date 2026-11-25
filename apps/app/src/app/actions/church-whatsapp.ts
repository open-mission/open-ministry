"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";
import { getAppBaseUrl } from "@/lib/app-url";
import { getOrganizationEntitlements, invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { getPlatformEvolutionConfig } from "@/lib/platform/evolution-config";
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  disconnectEvolutionInstance,
  formatPhoneNumberForEvolution,
  getEvolutionInstanceStatus,
  sendEvolutionTextMessage,
} from "@/lib/evolution-api";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";

export type ChurchWhatsAppView =
  | {
      state: "blocked";
      organizationId: string;
      planName: string | null;
      reason: string;
    }
  | {
      state: "ready";
      organizationId: string;
      steps: string[];
    }
  | {
      state: "pairing" | "connected";
      organizationId: string;
      instanceName: string;
      connectionStatus: string;
      connectedPhone: string | null;
      connectedProfileName: string | null;
      lastError: string | null;
      isActive: boolean;
    };

async function requireChurchAdmin() {
  const context = await getOrganizationContext();
  if (!context?.isAdmin) return null;
  return context;
}

function webhookUrl(secret: string): string {
  return `${getAppBaseUrl().replace(/\/+$/, "")}/api/webhooks/evolution?token=${secret}`;
}

async function requireWhatsAppEntitlement(organizationId: string): Promise<boolean> {
  const entitlements = await getOrganizationEntitlements(organizationId);
  return entitlements.whatsapp.enabled;
}

/** DTO seguro: nunca inclui apiUrl, globalApiKey, instanceToken nem webhookSecret. */
export async function getChurchWhatsAppViewAction(): Promise<ChurchWhatsAppView | null> {
  const context = await requireChurchAdmin();
  if (!context) return null;

  const [entitlements, channel] = await Promise.all([
    getOrganizationEntitlements(context.organization.id),
    db.query.organizationNotificationChannel.findFirst({
      where: and(
        eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
        eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
      ),
    }),
  ]);

  if (!entitlements.whatsapp.enabled) {
    return {
      state: "blocked",
      organizationId: context.organization.id,
      planName: entitlements.plan?.name ?? null,
      reason: "Este recurso ainda não está liberado no plano da sua igreja.",
    };
  }

  if (!channel?.instanceName || channel.managedByPlatform === false) {
    return {
      state: "ready",
      organizationId: context.organization.id,
      steps: [
        "Crie a conexão do WhatsApp para sua igreja.",
        "Escaneie o QR Code com o celular.",
        "Pronto: escalas e avisos chegam automaticamente.",
      ],
    };
  }

  return {
    state: channel.connectionStatus === "connected" ? "connected" : "pairing",
    organizationId: context.organization.id,
    instanceName: channel.instanceName,
    connectionStatus: channel.connectionStatus,
    connectedPhone: channel.connectedPhone,
    connectedProfileName: channel.connectedProfileName,
    lastError: channel.lastError,
    isActive: channel.isActive,
  };
}

export async function createChurchWhatsAppInstanceAction(): Promise<{
  ok: boolean;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, error: "Apenas administradores podem criar a conexão." };
  const entitlements = await getOrganizationEntitlements(context.organization.id);
  if (!entitlements.whatsapp.enabled) {
    return { ok: false, error: "Recurso não liberado no plano da igreja." };
  }

  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });
  if (channel?.instanceName && channel.managedByPlatform !== false) {
    return { ok: false, error: "A igreja já possui uma instância. Use 'Recriar QR Code'." };
  }

  const platform = await getPlatformEvolutionConfig();
  if (!platform) return { ok: false, error: "Provedor de WhatsApp indisponível no momento." };

  const instanceName = `om-${context.organization.slug}`.slice(0, 60);
  const secret = randomUUID();
  const hook = webhookUrl(secret);

  const created = await createEvolutionInstance({
    apiUrl: platform.apiUrl,
    globalApiKey: platform.globalApiKey,
    instanceName,
    webhookUrl: hook,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const token = created.instanceToken;
  if (!token) {
    return { ok: false, error: "A Evolution não devolveu o token da instância." };
  }

  const connected = await connectEvolutionInstance({
    apiUrl: platform.apiUrl,
    globalApiKey: platform.globalApiKey,
    instanceToken: token,
    instanceName,
    webhookUrl: hook,
  });
  if (!connected.ok) return { ok: false, error: connected.error };

  const values = {
    instanceName,
    instanceToken: encryptSecret(token),
    webhookSecret: secret,
    connectionStatus: "disconnected",
    managedByPlatform: true,
    // Migração legada: remove a URL e a chave da igreja, que passam a ser
    // exclusivas da configuração global da plataforma.
    apiUrl: null,
    apiKey: null,
    isActive: true,
    updatedAt: new Date(),
  };
  if (channel) {
    await db
      .update(schema.organizationNotificationChannel)
      .set(values)
      .where(eq(schema.organizationNotificationChannel.id, channel.id));
  } else {
    await db.insert(schema.organizationNotificationChannel).values({
      id: randomUUID(),
      organizationId: context.organization.id,
      channel: "evolution_whatsapp",
      ...values,
    });
  }

  await invalidateOrganizationEntitlements(context.organization.id);
  return { ok: true, qrCode: connected.qrCode, pairingCode: connected.pairingCode };
}

export async function refreshChurchWhatsAppQrAction(): Promise<{
  ok: boolean;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, error: "Sem permissão." };
  if (!(await requireWhatsAppEntitlement(context.organization.id))) {
    return { ok: false, error: "Recurso não liberado no plano da igreja." };
  }
  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });
  const platform = await getPlatformEvolutionConfig();
  const token = channel ? decryptSecret(channel.instanceToken) : null;
  if (!channel?.instanceName || !platform || !token) {
    return { ok: false, error: "Conexão não encontrada." };
  }

  // Nunca gerar um segredo de webhook sem persisti-lo: o token usado pelo
  // Evolution precisa ser exatamente o mesmo gravado no banco.
  let webhookSecret = channel.webhookSecret;
  if (!webhookSecret) {
    webhookSecret = randomUUID();
    await db
      .update(schema.organizationNotificationChannel)
      .set({ webhookSecret, updatedAt: new Date() })
      .where(eq(schema.organizationNotificationChannel.id, channel.id));
  }

  const result = await connectEvolutionInstance({
    apiUrl: platform.apiUrl,
    globalApiKey: platform.globalApiKey,
    instanceToken: token,
    instanceName: channel.instanceName,
    webhookUrl: webhookUrl(webhookSecret),
  });
  return result;
}

export async function checkChurchWhatsAppStatusAction(): Promise<{
  ok: boolean;
  connected: boolean;
  state: string;
  phone: string | null;
  profileName: string | null;
  error?: string;
}> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, connected: false, state: "unauthorized", phone: null, profileName: null };
  if (!(await requireWhatsAppEntitlement(context.organization.id))) {
    return { ok: false, connected: false, state: "not_allowed", phone: null, profileName: null };
  }
  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });
  const platform = await getPlatformEvolutionConfig();
  const token = channel ? decryptSecret(channel.instanceToken) : null;
  if (!channel?.instanceName || !platform || !token) {
    return { ok: false, connected: false, state: "not_configured", phone: null, profileName: null };
  }

  const result = await getEvolutionInstanceStatus({
    apiUrl: platform.apiUrl,
    globalApiKey: platform.globalApiKey,
    instanceToken: token,
    instanceName: channel.instanceName,
  });

  if (result.ok && channel) {
    await db
      .update(schema.organizationNotificationChannel)
      .set({
        connectionStatus: result.connected ? "connected" : "disconnected",
        connectedPhone: result.connected ? (result.phone ?? null) : null,
        connectedProfileName: result.connected ? (result.profileName ?? null) : null,
        lastConnectedAt: result.connected ? new Date() : null,
        lastError: result.connected ? null : (result.error ?? null),
        updatedAt: new Date(),
      })
      .where(eq(schema.organizationNotificationChannel.id, channel.id));
  }

  return {
    ok: result.ok,
    connected: result.connected,
    state: result.state,
    phone: result.phone ?? null,
    profileName: result.profileName ?? null,
    error: result.error,
  };
}

export async function toggleChurchWhatsAppActiveAction(
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, error: "Sem permissão." };
  if (!(await requireWhatsAppEntitlement(context.organization.id))) {
    return { ok: false, error: "Recurso não liberado no plano da igreja." };
  }
  await db
    .update(schema.organizationNotificationChannel)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
        eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
      ),
    );
  await invalidateOrganizationEntitlements(context.organization.id);
  return { ok: true };
}

export async function disconnectChurchWhatsAppInstanceAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, error: "Sem permissão." };
  if (!(await requireWhatsAppEntitlement(context.organization.id))) {
    return { ok: false, error: "Recurso não liberado no plano da igreja." };
  }
  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });
  const platform = await getPlatformEvolutionConfig();
  const token = channel ? decryptSecret(channel.instanceToken) : null;
  if (channel?.instanceName && platform && token) {
    const result = await disconnectEvolutionInstance({
      apiUrl: platform.apiUrl,
      globalApiKey: platform.globalApiKey,
      instanceToken: token,
      instanceName: channel.instanceName,
    });
    if (!result.ok) return { ok: false, error: result.error };
  }

  await db
    .update(schema.organizationNotificationChannel)
    .set({
      connectionStatus: "disconnected",
      connectedPhone: null,
      connectedProfileName: null,
      lastConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
        eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
      ),
    );
  await invalidateOrganizationEntitlements(context.organization.id);
  return { ok: true };
}

export async function sendChurchWhatsAppTestMessageAction(
  recipientPhone: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await requireChurchAdmin();
  if (!context) return { ok: false, error: "Sem permissão." };
  if (!(await requireWhatsAppEntitlement(context.organization.id))) {
    return { ok: false, error: "Recurso não liberado no plano da igreja." };
  }

  const formatted = formatPhoneNumberForEvolution(recipientPhone);
  if (!formatted) return { ok: false, error: "Número de WhatsApp inválido." };

  const { config } = await import("@/lib/notification-service").then((m) =>
    m.getOrganizationEvolutionConfig(context.organization.id),
  );
  if (!config) return { ok: false, error: "Canal de WhatsApp indisponível para a igreja." };

  return sendEvolutionTextMessage({
    config,
    to: formatted,
    text:
      `✅ *Teste de Conexão - OpenMinistry*\n\n` +
      `A integração da igreja *${context.organization.name}* está funcionando!\n\n` +
      `Enviado em: ${new Date().toLocaleString("pt-BR")}`,
  });
}
