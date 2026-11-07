import "server-only";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  sendEvolutionTextMessage,
  type EvolutionConfig,
} from "@/lib/evolution-api";
import { createNotifications } from "@/lib/notifications";
import {
  enqueueNotificationJob,
  type NotificationJob,
} from "@/lib/queue";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendWebPushToUser } from "@/lib/push-notifications";

export type DispatchNotificationOptions = {
  organizationId: string;
  type: "welcome" | "assignment" | "announcement" | "monthly_availability";
  title: string;
  body?: string | null;
  href?: string | null;
  actorId?: string | null;
  userId?: string | null;
  personId?: string | null;
  phone?: string | null;
  name?: string | null;
  channels?: ("in_app" | "whatsapp" | "email" | "push")[];
  metadata?: {
    churchName?: string;
    eventTitle?: string;
    functionName?: string;
    eventDate?: string;
    eventTime?: string;
    link?: string;
    [key: string]: unknown;
  };
};

export async function getOrganizationEvolutionConfig(
  organizationId: string,
): Promise<{ channel: typeof schema.organizationNotificationChannel.$inferSelect | null; config: EvolutionConfig | null }> {
  try {
    const channel = await db.query.organizationNotificationChannel.findFirst({
      where: and(
        eq(schema.organizationNotificationChannel.organizationId, organizationId),
        eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
      ),
    });

    if (
      channel &&
      channel.isActive &&
      channel.apiUrl &&
      channel.apiKey &&
      channel.instanceName
    ) {
      return {
        channel,
        config: {
          apiUrl: channel.apiUrl,
          apiKey: channel.apiKey,
          instanceName: channel.instanceName,
        },
      };
    }

    return { channel: channel ?? null, config: null };
  } catch (error) {
    console.error("Erro ao buscar canal de notificação da igreja:", error);
    return { channel: null, config: null };
  }
}

export function buildWhatsAppMessageText(
  type: DispatchNotificationOptions["type"],
  options: {
    name: string;
    churchName: string;
    title: string;
    body?: string | null;
    href?: string | null;
    metadata?: DispatchNotificationOptions["metadata"];
  },
): string {
  const { name, churchName, title, body, href, metadata } = options;
  const baseUrl = getAppBaseUrl();
  const fullLink = href ? (href.startsWith("http") ? href : `${baseUrl}${href}`) : metadata?.link || baseUrl;

  switch (type) {
    case "welcome":
      return (
        `👋 *Olá, ${name}!* Seja muito bem-vindo(a) ao *OpenMinistry* da *${churchName}*!\n\n` +
        `Seu WhatsApp foi registrado para você receber escalas dos cultos, avisos e comunicações da igreja.\n\n` +
        `Acesse seu painel quando desejar:\n${fullLink}`
      );

    case "assignment": {
      const role = metadata?.functionName ? `• *Função:* ${metadata.functionName}\n` : "";
      const event = metadata?.eventTitle ? `• *Evento:* ${metadata.eventTitle}\n` : "";
      const date = metadata?.eventDate ? `• *Data:* ${metadata.eventDate}\n` : "";
      const time = metadata?.eventTime ? `• *Horário:* ${metadata.eventTime}\n` : "";

      return (
        `📋 *Nova Escala de Culto - ${churchName}*\n\n` +
        `Olá, *${name}*! Você foi escalado(a) para servir na equipe:\n\n` +
        `${event}${role}${date}${time}\n` +
        `Acesse o painel para visualizar o cronograma completo do culto e confirmar sua presença:\n` +
        `${fullLink}`
      );
    }

    case "announcement":
      return (
        `📢 *Aviso da Liderança - ${churchName}*\n\n` +
        `*${title}*\n\n` +
        `${body || ""}\n\n` +
        `Para mais informações, acesse:\n${fullLink}`
      );

    case "monthly_availability":
      return (
        `🗓️ *Disponibilidade para Servir - ${churchName}*\n\n` +
        `Olá, *${name}*! O novo mês está chegando.\n\n` +
        `Por favor, informe os dias e horários (manhã, tarde, noite) em que você poderá servir na igreja este mês:\n` +
        `${fullLink}`
      );

    default:
      return (
        `🔔 *${title}* (${churchName})\n\n` +
        `${body || ""}\n\n` +
        `${fullLink}`
      );
  }
}

/**
 * Unified multi-channel notification dispatcher.
 * Delivers in-app notification immediately and enqueues/dispatches WhatsApp message if configured.
 */
export async function dispatchNotification(
  options: DispatchNotificationOptions,
): Promise<{ inAppSent: boolean; whatsappSent: boolean; error?: string }> {
  let inAppSent = false;
  let whatsappSent = false;

  const {
    organizationId,
    type,
    title,
    body,
    href,
    actorId,
    userId,
    personId,
    channels,
    metadata,
  } = options;

  const shouldSendInApp = !channels || channels.includes("in_app");
  const shouldSendWhatsApp = !channels || channels.includes("whatsapp");
  const shouldSendPush = !channels || channels.includes("push");

  // 1. Deliver in-app notification if userId is known and in_app enabled
  if (shouldSendInApp && userId) {
    try {
      await createNotifications({
        organizationId,
        userIds: [userId],
        actorId,
        type,
        title,
        body,
        href,
      });
      inAppSent = true;
    } catch (err) {
      console.error("Falha ao criar notificação in-app:", err);
    }
  }

  // 1.1 Deliver Web Push notification if userId is known and push enabled
  if (shouldSendPush && userId) {
    sendWebPushToUser(userId, {
      title,
      body: body || "Você tem uma nova notificação no OpenMinistry.",
      url: href || "/dashboard/notifications",
    }).catch((err) => {
      console.warn("Falha no envio de push web:", err);
    });
  }

  if (!shouldSendWhatsApp) {
    return { inAppSent, whatsappSent: false };
  }

  // 2. Fetch Church Organization details and Evolution API Config
  const church = await db.query.organization.findFirst({
    where: eq(schema.organization.id, organizationId),
    columns: { name: true },
  });
  const churchName = church?.name || metadata?.churchName || "Sua Igreja";

  const { config: evolutionConfig } = await getOrganizationEvolutionConfig(
    organizationId,
  );

  if (!evolutionConfig) {
    // WhatsApp channel not configured or inactive
    return { inAppSent, whatsappSent: false };
  }

  // 3. Resolve phone and name
  let targetPhone = options.phone;
  let targetName = options.name;

  if (!targetPhone && personId) {
    const person = await db.query.person.findFirst({
      where: eq(schema.person.id, personId),
      columns: { phone: true, name: true, userId: true },
    });
    if (person) {
      targetPhone = person.phone;
      if (!targetName) targetName = person.name;
    }
  }

  if (!targetPhone && userId) {
    const userRec = await db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { phone: true, name: true },
    });
    if (userRec) {
      targetPhone = userRec.phone;
      if (!targetName) targetName = userRec.name;
    }
  }

  if (!targetPhone) {
    // No phone number found for recipient
    return { inAppSent, whatsappSent: false };
  }

  const recipientName = targetName || "Membro";
  const messageText = buildWhatsAppMessageText(type, {
    name: recipientName,
    churchName,
    title,
    body,
    href,
    metadata,
  });

  const job: NotificationJob = {
    organizationId,
    type,
    recipientPhone: targetPhone,
    recipientName,
    userId,
    personId,
    title,
    body,
    href,
    metadata: {
      ...metadata,
      churchName,
      text: messageText,
    },
  };

  // 4. Enqueue or dispatch WhatsApp notification
  await enqueueNotificationJob(job, async (payload) => {
    const res = await sendEvolutionTextMessage({
      config: evolutionConfig,
      to: payload.recipientPhone!,
      text: messageText,
    });
    if (res.ok) {
      whatsappSent = true;
    } else {
      console.warn("Falha no envio WhatsApp via Evolution API:", res.error);
    }
  });

  return { inAppSent, whatsappSent };
}
