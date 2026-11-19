import "server-only";

import { randomUUID } from "node:crypto";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  sendEmailViaBrevo,
  type BrevoContact,
  type SendBrevoEmailResult,
} from "./brevo";
import { getAppBaseUrl } from "@/lib/app-url";
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
 * Normaliza URLs de imagens usadas em e-mails transacionais.
 *
 * Aceita apenas caminhos relativos (`/brand/logo.png`) e URLs absolutas
 * `http:`/`https:`. Qualquer outro protocolo ou valor inválido vira `null`,
 * evitando `javascript:`, `data:` e afins em atributos `src`.
 */
export function normalizeEmailAssetUrl(
  url: string | null | undefined,
  baseUrl: string = getAppBaseUrl(),
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const candidate =
    trimmed.startsWith("/") && !trimmed.startsWith("//")
      ? `${baseUrl.replace(/\/+$/, "")}${trimmed}`
      : trimmed;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Assets da marca OpenMinistry usados no cabeçalho/rodapé dos e-mails.
 */
export function buildAppEmailBrandAssets(
  baseUrl: string = getAppBaseUrl(),
): { appLogoUrl: string; appWordmarkUrl: string } {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    appLogoUrl: `${base}/brand/openministry-app-icon-dark.png`,
    appWordmarkUrl: `${base}/brand/openministry-logo-full-black.png`,
  };
}

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
    const baseUrl = getAppBaseUrl();
    const brandAssets = buildAppEmailBrandAssets(baseUrl);
    const data: Record<string, unknown> = { ...options.data };

    const normalizedChurchLogo = normalizeEmailAssetUrl(
      typeof data.churchLogo === "string" ? data.churchLogo : null,
      baseUrl,
    );

    let churchName =
      typeof data.churchName === "string" && data.churchName.trim()
        ? data.churchName
        : undefined;
    let churchLogo = normalizedChurchLogo;

    if (
      options.organizationId &&
      (!churchName || data.churchLogo === undefined)
    ) {
      try {
        const organization = await db.query?.organization?.findFirst?.({
          where: eq(schema.organization.id, options.organizationId),
          columns: { name: true, logo: true },
        });

        if (organization) {
          if (!churchName && organization.name) {
            churchName = organization.name;
          }

          if (data.churchLogo === undefined) {
            churchLogo = normalizeEmailAssetUrl(organization.logo, baseUrl);
          }
        }
      } catch (organizationError) {
        // Nunca impede o envio por causa da hidratação da organização.
        console.error(
          "[EmailService] Erro ao buscar dados da organização:",
          organizationError,
        );
      }
    }

    const rendered = await renderTemplateHtml(
      options.type,
      {
        ...brandAssets,
        ...data,
        ...(options.to.name ? { name: options.to.name } : {}),
        ...(options.subject ? { subject: options.subject } : {}),
        ...(churchName ? { churchName } : {}),
        churchLogo,
      },
      { useSampleData: false },
    );
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
  organizationId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const log = await db.query.emailMessageLog.findFirst({
    // Com organizationId informado, a busca fica escopada: logs da
    // organização do chamador ou e-mails de plataforma (organizationId
    // nulo). A autorização fina (dono do e-mail/departamento) fica na
    // camada de actions.
    where: organizationId
      ? and(
          eq(schema.emailMessageLog.id, logId),
          or(
            eq(schema.emailMessageLog.organizationId, organizationId),
            isNull(schema.emailMessageLog.organizationId),
          ),
        )
      : eq(schema.emailMessageLog.id, logId),
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

export type EmailLogStats = {
  total: number;
  sent: number;
  failed: number;
};

/**
 * Lista logs de e-mail com escopo de autorização embutido:
 * - Sem `departmentIds` (admin): todos os logs da organização, somados aos
 *   e-mails de autenticação do próprio usuário (organizationId nulo).
 * - Com `departmentIds` (líder): apenas logs de pessoas membros desses
 *   departamentos (subquery em departmentMember), somados aos e-mails do
 *   próprio usuário. Array vazio = fail-closed (nenhum acesso).
 * As estatísticas seguem o recorte da organização (com departamentos
 * quando aplicável), sem o ramo de e-mails de autenticação do usuário.
 */
export async function listEmailMessageLogs(
  organizationId: string,
  options?: {
    limit?: number;
    status?: "all" | "sent" | "failed";
    type?: string;
    search?: string;
    departmentIds?: string[];
    viewerUserId?: string;
  },
): Promise<{
  logs: (typeof schema.emailMessageLog.$inferSelect)[];
  stats: EmailLogStats;
}> {
  const limit = options?.limit ?? 100;

  const orgCondition = eq(
    schema.emailMessageLog.organizationId,
    organizationId,
  );

  let departmentScope: SQL | undefined;
  if (options?.departmentIds) {
    if (options.departmentIds.length === 0) {
      return { logs: [], stats: { total: 0, sent: 0, failed: 0 } };
    }

    departmentScope = inArray(
      schema.emailMessageLog.personId,
      db
        .select({ id: schema.person.id })
        .from(schema.departmentMember)
        .where(
          inArray(
            schema.departmentMember.departmentId,
            options.departmentIds,
          ),
        ),
    );
  }

  const viewerCondition = options?.viewerUserId
    ? eq(schema.emailMessageLog.userId, options.viewerUserId)
    : undefined;

  const baseConditions = viewerCondition
    ? departmentScope
      ? or(and(orgCondition, departmentScope), viewerCondition)
      : or(orgCondition, viewerCondition)
    : departmentScope
      ? and(orgCondition, departmentScope)
      : orgCondition;

  const filterConditions: SQL[] = [];

  if (options?.status && options.status !== "all") {
    filterConditions.push(eq(schema.emailMessageLog.status, options.status));
  }

  if (options?.type && options.type !== "all") {
    filterConditions.push(eq(schema.emailMessageLog.type, options.type));
  }

  if (options?.search && options.search.trim().length > 0) {
    const query = `%${options.search.trim()}%`;
    filterConditions.push(
      or(
        ilike(schema.emailMessageLog.recipientEmail, query),
        ilike(schema.emailMessageLog.recipientName, query),
        ilike(schema.emailMessageLog.subject, query),
      )!,
    );
  }

  const logsWhere = filterConditions.length
    ? and(baseConditions, ...filterConditions)
    : baseConditions;

  const statsWhere = departmentScope
    ? and(orgCondition, departmentScope)
    : orgCondition;

  const [logs, statRows] = await Promise.all([
    db.query.emailMessageLog.findMany({
      where: logsWhere,
      orderBy: [desc(schema.emailMessageLog.createdAt)],
      limit,
    }),
    db.query.emailMessageLog.findMany({
      where: statsWhere,
      columns: { status: true },
    }),
  ]);

  const stats: EmailLogStats = {
    total: statRows.length,
    sent: statRows.filter((row) => row.status === "sent").length,
    failed: statRows.filter((row) => row.status === "failed").length,
  };

  return { logs, stats };
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

  const data: Record<string, unknown> = { ...meta.sampleData, ...customData };
  // Sem `churchLogo` explícito no customData, deixamos a chave ausente para
  // que o envio hidrate a logo da organização quando houver organizationId.
  if (data.churchLogo === undefined) {
    delete data.churchLogo;
  }

  return await sendTransactionalEmail({
    type,
    to: { email: targetEmail, name: "Usuário de Teste" },
    organizationId,
    data,
  });
}
