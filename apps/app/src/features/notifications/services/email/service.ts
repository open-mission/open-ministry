import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  sendEmailViaBrevo,
  type BrevoContact,
  type SendBrevoEmailResult,
} from "./brevo";
import {
  EMAIL_TEMPLATES,
  renderTemplateHtml,
  type EmailTemplateKey,
} from "./templates";

export type SendTransactionalEmailOptions = {
  type: EmailTemplateKey;
  to: BrevoContact;
  data: Record<string, unknown>;
  organizationId?: string | null;
  userId?: string | null;
  personId?: string | null;
  notificationId?: string | null;
  batchId?: string | null;
  subject?: string;
  sender?: BrevoContact;
  replyTo?: BrevoContact;
};

export type SendTransactionalEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  logId: string;
};

/**
 * Envia um email transacional utilizando React Email e o provedor Brevo,
 * registrando o log completo na tabela email_message_log.
 */
export async function sendTransactionalEmail(
  options: SendTransactionalEmailOptions,
): Promise<SendTransactionalEmailResult> {
  const logId = randomUUID();

  let html = "";
  let subject = options.subject || "";

  try {
    const rendered = await renderTemplateHtml(options.type, {
      ...options.data,
      ...(options.to.name ? { name: options.to.name } : {}),
      ...(options.subject ? { subject: options.subject } : {}),
    });
    html = rendered.html;
    if (!subject) {
      subject = rendered.subject;
    }
  } catch (renderError) {
    const errorMsg =
      renderError instanceof Error
        ? renderError.message
        : "Erro ao renderizar template de email";
    console.error("[EmailService] Falha na renderização:", errorMsg);

    try {
      await db.insert(schema.emailMessageLog).values({
        id: logId,
        organizationId: options.organizationId ?? null,
        notificationId: options.notificationId ?? null,
        batchId: options.batchId ?? null,
        type: options.type,
        recipientEmail: options.to.email,
        recipientName: options.to.name ?? null,
        subject: subject || `Email: ${options.type}`,
        htmlContent: `<p>Falha ao renderizar template: ${errorMsg}</p>`,
        personId: options.personId ?? null,
        userId: options.userId ?? null,
        status: "failed",
        lastError: errorMsg,
        attempts: 1,
      });
    } catch (dbErr) {
      console.error("[EmailService] Erro ao persistir log de falha:", dbErr);
    }

    return { ok: false, error: errorMsg, logId };
  }

  // Envio via Brevo
  let brevoResult: SendBrevoEmailResult;
  try {
    brevoResult = await sendEmailViaBrevo({
      to: [options.to],
      subject,
      htmlContent: html,
      sender: options.sender,
      replyTo: options.replyTo,
      tags: [options.type],
    });
  } catch (sendError) {
    const errorMsg =
      sendError instanceof Error
        ? sendError.message
        : "Falha na chamada ao Brevo";
    brevoResult = { ok: false, error: errorMsg };
  }

  // Persistência no banco
  try {
    await db.insert(schema.emailMessageLog).values({
      id: logId,
      organizationId: options.organizationId ?? null,
      notificationId: options.notificationId ?? null,
      batchId: options.batchId ?? null,
      type: options.type,
      recipientEmail: options.to.email,
      recipientName: options.to.name ?? null,
      subject,
      htmlContent: html,
      personId: options.personId ?? null,
      userId: options.userId ?? null,
      status: brevoResult.ok ? "sent" : "failed",
      brevoMessageId: brevoResult.messageId ?? null,
      lastError: brevoResult.error ?? null,
      sentAt: brevoResult.ok ? new Date() : null,
      attempts: 1,
    });
  } catch (dbErr) {
    console.error("[EmailService] Erro ao salvar email_message_log:", dbErr);
  }

  return {
    ok: brevoResult.ok,
    messageId: brevoResult.messageId,
    error: brevoResult.error,
    logId,
  };
}

/**
 * Reenvia um email anteriormente registrado na tabela email_message_log.
 */
export async function resendLoggedEmail(
  logId: string,
  targetEmailOverride?: string,
): Promise<{ ok: boolean; error?: string }> {
  const log = await db.query.emailMessageLog.findFirst({
    where: eq(schema.emailMessageLog.id, logId),
  });

  if (!log) {
    return { ok: false, error: "Registro de email não encontrado." };
  }

  const recipientEmail = targetEmailOverride?.trim() || log.recipientEmail;
  const brevoResult = await sendEmailViaBrevo({
    to: [{ email: recipientEmail, name: log.recipientName ?? undefined }],
    subject: log.subject,
    htmlContent: log.htmlContent,
    tags: [log.type, "resend"],
  });

  await db
    .update(schema.emailMessageLog)
    .set({
      status: brevoResult.ok ? "sent" : "failed",
      brevoMessageId: brevoResult.messageId ?? log.brevoMessageId,
      lastError: brevoResult.error ?? null,
      sentAt: brevoResult.ok ? new Date() : log.sentAt,
      attempts: (log.attempts || 1) + 1,
      recipientEmail,
    })
    .where(eq(schema.emailMessageLog.id, logId));

  return brevoResult;
}

/**
 * Envia um email de teste de um modelo específico para verificação de layout.
 */
export async function sendTestEmail(
  type: EmailTemplateKey,
  targetEmail: string,
  organizationId?: string | null,
  customData?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const meta = EMAIL_TEMPLATES[type];
  if (!meta) {
    return { ok: false, error: "Modelo de email não encontrado." };
  }

  return await sendTransactionalEmail({
    type,
    to: { email: targetEmail, name: "Usuário de Teste" },
    organizationId,
    data: {
      ...meta.sampleData,
      ...customData,
    },
  });
}
