"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  isUserLeaderInAnyDepartment,
  listUserLeaderDepartments,
} from "@/lib/departments";
import {
  listEmailMessageLogs,
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
    const options: NonNullable<Parameters<typeof listEmailMessageLogs>[1]> = {
      status: filters?.status,
      type: filters?.type,
      search: filters?.search,
      limit: filters?.limit,
      viewerUserId: context.session.user.id,
    };

    if (!context.isAdmin) {
      // Escopo de líder: apenas logs de pessoas dos departamentos que lidera
      // (o gate acima só verifica o papel, não restringe o volume).
      const ledDepartments = await listUserLeaderDepartments(
        context.organization.id,
        context.session.user.id,
      );

      if (ledDepartments.length === 0) {
        return {
          ok: true,
          logs: [],
          stats: { total: 0, sent: 0, failed: 0 },
        };
      }

      options.departmentIds = ledDepartments.map(
        (department) => department.id,
      );
    }

    const result = await listEmailMessageLogs(
      context.organization.id,
      options,
    );

    return {
      ok: true,
      logs: result.logs as EmailLogItem[],
      stats: result.stats,
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

  // Busca sempre escopada: logs da organização ativa (admin) ou os e-mails
  // de autenticação do próprio usuário — nunca registros de outra igreja.
  const log = await db.query.emailMessageLog.findFirst({
    where: and(
      eq(schema.emailMessageLog.id, logId),
      or(
        eq(schema.emailMessageLog.organizationId, context.organization.id),
        eq(schema.emailMessageLog.userId, context.session.user.id),
      ),
    ),
    columns: { personId: true, userId: true },
  });

  if (!log) {
    return { ok: false, error: "Registro de email não encontrado." };
  }

  if (!context.isAdmin) {
    // Escopo de líder: o próprio e-mail de autenticação, ou e-mails de
    // pessoas dos departamentos que lidera. E-mail sem pessoa/usuário
    // vinculado (broadcast) fica fora do escopo.
    let inScope = log.userId === context.session.user.id;

    if (!inScope) {
      const ledDepartments = await listUserLeaderDepartments(
        context.organization.id,
        context.session.user.id,
      );

      if (ledDepartments.length === 0) {
        return { ok: false, error: "Você não lidera nenhum departamento." };
      }

      inScope = log.personId
        ? Boolean(
            await db.query.departmentMember.findFirst({
              where: and(
                eq(schema.departmentMember.personId, log.personId),
                inArray(
                  schema.departmentMember.departmentId,
                  ledDepartments.map((department) => department.id),
                ),
              ),
              columns: { id: true },
            }),
          )
        : false;
    }

    if (!inScope) {
      return {
        ok: false,
        error: "Você só pode reenviar e-mails do seu departamento.",
      };
    }
  }

  const result = await resendLoggedEmail(
    logId,
    targetEmailOverride,
    context.organization.id,
  );
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
