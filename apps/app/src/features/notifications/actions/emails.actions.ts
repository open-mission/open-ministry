"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import {
  resendLoggedEmail,
  sendTestEmail,
} from "@/lib/email/service";
import type { EmailTemplateKey } from "@/lib/email/templates";
import { getOrganizationContext } from "@/lib/organizations";

export type EmailLogItem = {
  id: string;
  organizationId: string | null;
  notificationId: string | null;
  batchId: string | null;
  type: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  status: string;
  brevoMessageId: string | null;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type ListEmailLogsFilter = {
  search?: string;
  status?: "all" | "sent" | "failed";
  type?: string;
  limit?: number;
};

export type EmailStats = {
  total: number;
  sent: number;
  failed: number;
};

/**
 * Busca a lista de logs de emails enviados para a organização ativa.
 */
export async function listEmailLogsAction(filters?: ListEmailLogsFilter): Promise<{
  ok: boolean;
  logs: EmailLogItem[];
  stats: EmailStats;
  error?: string;
}> {
  const context = await getOrganizationContext();
  if (!context) {
    return {
      ok: false,
      logs: [],
      stats: { total: 0, sent: 0, failed: 0 },
      error: "Sessão inválida ou sem organização ativa.",
    };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : true;

  if (!context.isAdmin && !isLeader) {
    return {
      ok: false,
      logs: [],
      stats: { total: 0, sent: 0, failed: 0 },
      error: "Você não tem permissão para visualizar o histórico de emails.",
    };
  }

  try {
    const conditions = [
      or(
        eq(schema.emailMessageLog.organizationId, context.organization.id),
        // Permite que admins vejam emails de autenticação associados ao seu usuário
        eq(schema.emailMessageLog.userId, context.session.user.id),
      ),
    ];

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(schema.emailMessageLog.status, filters.status));
    }

    if (filters?.type && filters.type !== "all") {
      conditions.push(eq(schema.emailMessageLog.type, filters.type));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const query = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.emailMessageLog.recipientEmail, query),
          ilike(schema.emailMessageLog.recipientName, query),
          ilike(schema.emailMessageLog.subject, query),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const logs = await db.query.emailMessageLog.findMany({
      where: whereClause,
      orderBy: [desc(schema.emailMessageLog.createdAt)],
      limit: filters?.limit ?? 100,
    });

    // Calcula estatísticas básicas da organização
    const allOrgLogs = await db.query.emailMessageLog.findMany({
      where: eq(schema.emailMessageLog.organizationId, context.organization.id),
      columns: { status: true },
    });

    const stats: EmailStats = {
      total: allOrgLogs.length,
      sent: allOrgLogs.filter((l) => l.status === "sent").length,
      failed: allOrgLogs.filter((l) => l.status === "failed").length,
    };

    return {
      ok: true,
      logs: logs as EmailLogItem[],
      stats,
    };
  } catch (error) {
    console.error("Erro ao listar logs de emails:", error);
    return {
      ok: false,
      logs: [],
      stats: { total: 0, sent: 0, failed: 0 },
      error: "Falha ao carregar registros de emails do banco de dados.",
    };
  }
}

/**
 * Reenvia um email anteriormente registrado.
 */
export async function resendEmailAction(
  logId: string,
  targetEmailOverride?: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sessão inválida." };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : true;

  if (!context.isAdmin && !isLeader) {
    return { ok: false, error: "Permissão insuficiente para reenviar emails." };
  }

  const result = await resendLoggedEmail(logId, targetEmailOverride);
  revalidatePath("/dashboard/emails");
  return result;
}

const testEmailSchema = z.object({
  type: z.enum([
    "welcome",
    "reset_password",
    "magic_link",
    "email_verification",
    "assignment",
    "announcement",
  ]),
  targetEmail: z.string().email("Informe um email válido para o teste."),
});

/**
 * Obtém o HTML renderizado de um modelo específico para visualização prévia.
 */
export async function getTemplatePreviewAction(
  templateKey: EmailTemplateKey,
  customData?: Record<string, unknown>,
): Promise<{ ok: boolean; html: string; subject: string; error?: string }> {
  try {
    const { renderTemplateHtml } = await import("@/lib/email/templates");
    const rendered = await renderTemplateHtml(templateKey, customData ?? {});
    return { ok: true, html: rendered.html, subject: rendered.subject };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, html: "", subject: "", error: msg };
  }
}

export async function sendTestEmailAction(
  templateKey: EmailTemplateKey,
  targetEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sessão inválida." };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : true;

  if (!context.isAdmin && !isLeader) {
    return {
      ok: false,
      error: "Apenas líderes e administradores podem enviar emails de teste.",
    };
  }

  const parsed = testEmailSchema.safeParse({
    type: templateKey,
    targetEmail,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const result = await sendTestEmail(
    templateKey,
    targetEmail,
    context.organization.id,
    {
      churchName: context.organization.name,
      authorName: context.session.user.name,
    },
  );

  revalidatePath("/dashboard/emails");
  return result;
}
