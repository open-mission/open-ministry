"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createNotifications,
  getNotificationRecipients,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { getOrganizationContext } from "@/lib/organizations";

export type AnnouncementFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        body?: string[];
        audience?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type NotificationActionResult = {
  ok: boolean;
  error?: string;
};

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Informe o título do aviso.")
    .max(80, "O título pode ter no máximo 80 caracteres."),
  body: z
    .string()
    .trim()
    .min(2, "Escreva a mensagem do aviso.")
    .max(500, "A mensagem pode ter no máximo 500 caracteres."),
  audience: z.string().trim().min(1, "Escolha quem vai receber."),
});

function revalidateNotifications() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export async function sendAnnouncementAction(
  _state: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  if (!context.isAdmin) {
    return {
      error: "Só administradores podem enviar avisos para a equipe.",
    };
  }

  const departmentId =
    parsed.data.audience === "all" ? null : parsed.data.audience;
  const recipients = await getNotificationRecipients(
    context.organization.id,
    departmentId,
  );
  const userIds = recipients.filter(
    (userId) => userId !== context.session.user.id,
  );

  if (userIds.length === 0) {
    return {
      error: departmentId
        ? "Esse departamento não tem pessoas com conta para notificar."
        : "Nenhuma outra pessoa com conta para notificar.",
    };
  }

  try {
    await createNotifications({
      organizationId: context.organization.id,
      userIds,
      actorId: context.session.user.id,
      type: "announcement",
      title: parsed.data.title,
      body: parsed.data.body,
      href: null,
    });
  } catch (error) {
    console.error("Erro ao enviar aviso", error);
    return { error: "Não foi possível enviar o aviso." };
  }

  revalidateNotifications();
  return { success: true };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  if (!notificationId) {
    return { ok: false, error: "Notificação inválida." };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return {
      ok: false,
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  const marked = await markNotificationRead(
    context.organization.id,
    context.session.user.id,
    notificationId,
  );

  if (!marked) {
    return { ok: false, error: "Notificação não encontrada." };
  }

  revalidateNotifications();
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      ok: false,
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  await markAllNotificationsRead(
    context.organization.id,
    context.session.user.id,
  );

  revalidateNotifications();
  return { ok: true };
}

export type NotificationPreviewItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export async function getRecentNotificationsAction(
  limit = 5,
): Promise<NotificationPreviewItem[]> {
  const context = await getOrganizationContext();

  if (!context) {
    return [];
  }

  const rows = await listNotifications(
    context.organization.id,
    context.session.user.id,
    limit,
  );

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    read: Boolean(n.readAt),
    createdAt: n.createdAt.toISOString(),
  }));
}
