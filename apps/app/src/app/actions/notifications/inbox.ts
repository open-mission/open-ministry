"use server";

import { getOrganizationContext } from "@/lib/organizations";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import {
  retryFailedWhatsAppMessages,
  retryWhatsAppMessage,
} from "@/lib/notification-service";
import { can } from "@/lib/permissions/service";
import { revalidateNotifications } from "./shared";
import type { NotificationActionResult } from "./shared";

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

  await revalidateNotifications(context.session.user.id);
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

  await revalidateNotifications(context.session.user.id);
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

export async function retryAnnouncementWhatsAppAction(
  batchId?: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const allowed = await can("announcements", "retryDelivery");
  if (!allowed) {
    return {
      ok: false,
      count: 0,
      error: "Você não tem permissão para reenviar avisos.",
    };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, count: 0, error: "Sua sessão expirou." };
  }

  const res = await retryFailedWhatsAppMessages(context.organization.id, batchId);
  await revalidateNotifications(context.session.user.id);
  return { ok: true, count: res.sent };
}

export async function retryAnnouncementSingleWhatsAppAction(
  logId: string,
): Promise<{ ok: boolean; error?: string }> {
  const allowed = await can("announcements", "retryDelivery");
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para reenviar avisos.",
    };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const res = await retryWhatsAppMessage(logId, context.organization.id);
  await revalidateNotifications(context.session.user.id);
  return res;
}
