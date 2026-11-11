import "server-only";

import { randomUUID } from "node:crypto";
import { eq, and, sql, desc, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
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
import type { MessageTemplateType } from "@/lib/message-templates";
import { renderOrganizationMessageText } from "@/lib/message-templates-server";
import { sendTransactionalEmail } from "@/lib/email/service";

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
  email?: string | null;
  name?: string | null;
  batchId?: string;
  notificationId?: string;
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
  return remember(
    `org:${organizationId}:evolution-config`,
    300,
    async () => {
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
    },
    [`evolution:${organizationId}`],
  );
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
): Promise<{
  inAppSent: boolean;
  whatsappSent: boolean;
  emailSent: boolean;
  error?: string;
}> {
  let inAppSent = false;
  let whatsappSent = false;
  let emailSent = false;

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
  const shouldSendEmail = !channels || channels.includes("email");

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

  // 2. Fetch Church Organization details
  const church = await db.query.organization.findFirst({
    where: eq(schema.organization.id, organizationId),
    columns: { name: true },
  });
  const churchName = church?.name || metadata?.churchName || "Sua Igreja";

  // 3. Resolve phone, email and name
  let targetPhone = options.phone;
  let targetEmail = options.email;
  let targetName = options.name;

  if ((!targetPhone || !targetEmail || !targetName) && personId) {
    const person = await db.query.person.findFirst({
      where: eq(schema.person.id, personId),
      columns: { phone: true, email: true, name: true, userId: true },
    });
    if (person) {
      if (!targetPhone) targetPhone = person.phone;
      if (!targetEmail) targetEmail = person.email;
      if (!targetName) targetName = person.name;
    }
  }

  if ((!targetPhone || !targetEmail || !targetName) && userId) {
    const userRec = await db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { phone: true, email: true, name: true },
    });
    if (userRec) {
      if (!targetPhone) targetPhone = userRec.phone;
      if (!targetEmail) targetEmail = userRec.email;
      if (!targetName) targetName = userRec.name;
    }
  }

  const recipientName = targetName || "Membro";
  const baseUrl = getAppBaseUrl();
  const fullLink = href
    ? href.startsWith("http")
      ? href
      : `${baseUrl}${href}`
    : (metadata?.link as string) || baseUrl;

  // 4. Deliver Email notification via Brevo (if email enabled and targetEmail exists)
  if (shouldSendEmail && targetEmail) {
    try {
      if (type === "assignment") {
        const res = await sendTransactionalEmail({
          type: "assignment",
          to: { email: targetEmail, name: recipientName },
          organizationId,
          userId: userId ?? null,
          personId: personId ?? null,
          notificationId: options.notificationId ?? null,
          batchId: options.batchId ?? null,
          subject: title,
          data: {
            name: recipientName,
            churchName,
            eventTitle: (metadata?.eventTitle as string) || title,
            functionName: (metadata?.functionName as string) || "",
            eventDate: (metadata?.eventDate as string) || "",
            eventTime: (metadata?.eventTime as string) || "",
            eventUrl: fullLink,
            notes: body || undefined,
          },
        });
        emailSent = res.ok;
      } else if (type === "announcement") {
        const res = await sendTransactionalEmail({
          type: "announcement",
          to: { email: targetEmail, name: recipientName },
          organizationId,
          userId: userId ?? null,
          personId: personId ?? null,
          notificationId: options.notificationId ?? null,
          batchId: options.batchId ?? null,
          subject: title,
          data: {
            name: recipientName,
            churchName,
            title,
            body: body || "",
            authorName: (metadata?.authorName as string) || undefined,
            announcementUrl: fullLink,
          },
        });
        emailSent = res.ok;
      } else if (type === "welcome") {
        const res = await sendTransactionalEmail({
          type: "welcome",
          to: { email: targetEmail, name: recipientName },
          organizationId,
          userId: userId ?? null,
          personId: personId ?? null,
          data: {
            name: recipientName,
            churchName,
            dashboardUrl: fullLink,
          },
        });
        emailSent = res.ok;
      }
    } catch (err) {
      console.error("Falha ao disparar email de notificação:", err);
    }
  }

  if (!shouldSendWhatsApp || !targetPhone) {
    return { inAppSent, whatsappSent: false, emailSent };
  }

  const { config: evolutionConfig } = await getOrganizationEvolutionConfig(
    organizationId,
  );

  let messageText = "";
  try {
    messageText = await renderOrganizationMessageText({
      organizationId,
      type: type as MessageTemplateType,
      variables: {
        name: recipientName,
        church_name: churchName,
        link: fullLink,
        event_title: (metadata?.eventTitle as string) || "",
        function_name: (metadata?.functionName as string) || "",
        event_date: (metadata?.eventDate as string) || "",
        event_time: (metadata?.eventTime as string) || "",
        title,
        body: body || "",
        church_phone: evolutionConfig?.instanceName || "",
        whatsapp_name: evolutionConfig?.instanceName || "",
      },
    });
  } catch {
    messageText = buildWhatsAppMessageText(type, {
      name: recipientName,
      churchName,
      title,
      body,
      href,
      metadata,
    });
  }

  // 4. Create persistent queue log record
  const logId = randomUUID();
  try {
    await db.insert(schema.whatsappMessageLog).values({
      id: logId,
      organizationId,
      notificationId: options.notificationId ?? null,
      batchId: options.batchId ?? null,
      type,
      recipientPhone: targetPhone,
      recipientName,
      personId: personId ?? null,
      userId: userId ?? null,
      content: messageText,
      status: evolutionConfig ? "pending" : "failed",
      attempts: 0,
      lastError: evolutionConfig
        ? null
        : "Canal do WhatsApp inativo ou não configurado na igreja.",
    });
  } catch (err) {
    console.error("Falha ao salvar log de mensagem WhatsApp:", err);
  }

  if (!evolutionConfig) {
    return {
      inAppSent,
      whatsappSent: false,
      emailSent,
      error: "Canal do WhatsApp inativo ou não configurado na igreja.",
    };
  }

  const job: NotificationJob = {
    whatsappLogId: logId,
    batchId: options.batchId,
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

  // 5. Enqueue or dispatch WhatsApp notification
  await enqueueNotificationJob(job, async (payload) => {
    try {
      await db
        .update(schema.whatsappMessageLog)
        .set({
          status: "sending",
          attempts: sql`${schema.whatsappMessageLog.attempts} + 1`,
        })
        .where(eq(schema.whatsappMessageLog.id, logId));

      const res = await sendEvolutionTextMessage({
        config: evolutionConfig,
        to: payload.recipientPhone!,
        text: messageText,
      });

      if (res.ok) {
        whatsappSent = true;
        await db
          .update(schema.whatsappMessageLog)
          .set({
            status: "sent",
            evolutionMessageId: res.messageId ?? null,
            sentAt: new Date(),
            lastError: null,
          })
          .where(eq(schema.whatsappMessageLog.id, logId));
      } else {
        await db
          .update(schema.whatsappMessageLog)
          .set({
            status: "failed",
            lastError: res.error || "Falha no envio via Evolution API",
          })
          .where(eq(schema.whatsappMessageLog.id, logId));
        console.warn("Falha no envio WhatsApp via Evolution API:", res.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      await db
        .update(schema.whatsappMessageLog)
        .set({
          status: "failed",
          lastError: msg,
        })
        .where(eq(schema.whatsappMessageLog.id, logId));
    }
  });

  return { inAppSent, whatsappSent, emailSent };
}

/**
 * Re-envia uma mensagem específica da fila que falhou ou permaneceu pendente.
 */
export async function retryWhatsAppMessage(
  logId: string,
  organizationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const log = await db.query.whatsappMessageLog.findFirst({
    where: and(
      eq(schema.whatsappMessageLog.id, logId),
      eq(schema.whatsappMessageLog.organizationId, organizationId),
    ),
  });

  if (!log) {
    return { ok: false, error: "Registro de mensagem não encontrado." };
  }

  const { config: evolutionConfig } = await getOrganizationEvolutionConfig(
    organizationId,
  );

  if (!evolutionConfig) {
    return {
      ok: false,
      error: "Canal do WhatsApp inativo ou não configurado na igreja.",
    };
  }

  try {
    await db
      .update(schema.whatsappMessageLog)
      .set({
        status: "sending",
        attempts: sql`${schema.whatsappMessageLog.attempts} + 1`,
      })
      .where(eq(schema.whatsappMessageLog.id, logId));

    const res = await sendEvolutionTextMessage({
      config: evolutionConfig,
      to: log.recipientPhone,
      text: log.content,
    });

    if (res.ok) {
      await db
        .update(schema.whatsappMessageLog)
        .set({
          status: "sent",
          evolutionMessageId: res.messageId ?? null,
          sentAt: new Date(),
          lastError: null,
        })
        .where(eq(schema.whatsappMessageLog.id, logId));
      return { ok: true };
    }

    await db
      .update(schema.whatsappMessageLog)
      .set({
        status: "failed",
        lastError: res.error || "Falha ao reenviar via Evolution API",
      })
      .where(eq(schema.whatsappMessageLog.id, logId));

    return { ok: false, error: res.error || "Falha no envio." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    await db
      .update(schema.whatsappMessageLog)
      .set({
        status: "failed",
        lastError: msg,
      })
      .where(eq(schema.whatsappMessageLog.id, logId));

    return { ok: false, error: msg };
  }
}

/**
 * Re-envia em lote todas as mensagens pendentes ou com falha.
 */
export async function retryFailedWhatsAppMessages(
  organizationId: string,
  batchId?: string,
): Promise<{ total: number; sent: number; failed: number }> {
  const conditions = [
    eq(schema.whatsappMessageLog.organizationId, organizationId),
    or(
      eq(schema.whatsappMessageLog.status, "failed"),
      eq(schema.whatsappMessageLog.status, "pending"),
    ),
  ];

  if (batchId) {
    conditions.push(eq(schema.whatsappMessageLog.batchId, batchId));
  }

  const pendingList = await db.query.whatsappMessageLog.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.whatsappMessageLog.createdAt)],
    limit: 50,
  });

  if (pendingList.length === 0) {
    return { total: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const item of pendingList) {
    const res = await retryWhatsAppMessage(item.id, organizationId);
    if (res.ok) {
      sent += 1;
    } else {
      failed += 1;
    }
    // Small pause to prevent rate limiting issues
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    total: pendingList.length,
    sent,
    failed,
  };
}

export type EvolutionMessageLogItem = {
  id: string;
  batchId: string | null;
  type: string;
  recipientPhone: string;
  recipientName: string | null;
  content: string;
  status: "pending" | "sending" | "sent" | "delivered" | "read" | "failed";
  evolutionMessageId: string | null;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Lista o histórico de mensagens enviadas via WhatsApp para a igreja.
 */
export async function listEvolutionMessageLogs(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    type?: string;
    batchId?: string;
  },
): Promise<{ logs: EvolutionMessageLogItem[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const conditions = [
    eq(schema.whatsappMessageLog.organizationId, organizationId),
  ];

  if (options?.status && options.status !== "all") {
    conditions.push(eq(schema.whatsappMessageLog.status, options.status));
  }

  if (options?.type && options.type !== "all") {
    conditions.push(eq(schema.whatsappMessageLog.type, options.type));
  }

  if (options?.batchId) {
    conditions.push(eq(schema.whatsappMessageLog.batchId, options.batchId));
  }

  if (options?.search && options.search.trim()) {
    const query = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.whatsappMessageLog.recipientName, query),
        ilike(schema.whatsappMessageLog.recipientPhone, query),
        ilike(schema.whatsappMessageLog.content, query),
      )!,
    );
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.query.whatsappMessageLog.findMany({
      where,
      orderBy: [desc(schema.whatsappMessageLog.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.whatsappMessageLog)
      .where(where),
  ]);

  return {
    logs: rows as EvolutionMessageLogItem[],
    total: Number(countRows[0]?.count ?? 0),
  };
}
