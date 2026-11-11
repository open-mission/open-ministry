"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import {
  createNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import {
  dispatchNotification,
  getOrganizationEvolutionConfig,
  retryWhatsAppMessage,
  retryFailedWhatsAppMessages,
} from "@/lib/notification-service";
import { sendWebPushToUser } from "@/lib/push-notifications";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export type AnnouncementFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        body?: string[];
        audienceType?: string[];
        departmentId?: string[];
        personId?: string[];
        channels?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type NotificationActionResult = {
  ok: boolean;
  error?: string;
};

const announcementSchema = z
  .object({
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
    audienceType: z.enum(["all", "department", "person"], {
      message: "Selecione o tipo de destinatário.",
    }),
    departmentId: z.string().trim().optional().nullable(),
    personId: z.string().trim().optional().nullable(),
    sendInApp: z.boolean(),
    sendWhatsApp: z.boolean(),
    sendPush: z.boolean().default(false),
    sendEmail: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.sendInApp || data.sendWhatsApp || data.sendPush || data.sendEmail,
    {
      message:
        "Selecione ao menos um canal ativo (Aplicativo, WhatsApp, Push ou Email).",
      path: ["channels"],
    },
  )
  .refine(
    (data) => {
      if (data.audienceType === "department") {
        return Boolean(data.departmentId && data.departmentId.length > 0);
      }
      return true;
    },
    {
      message: "Selecione o departamento que receberá o aviso.",
      path: ["departmentId"],
    },
  )
  .refine(
    (data) => {
      if (data.audienceType === "person") {
        return Boolean(data.personId && data.personId.length > 0);
      }
      return true;
    },
    {
      message: "Selecione a pessoa que receberá o aviso.",
      path: ["personId"],
    },
  );

async function revalidateNotifications(userId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/announcements");

  if (userId) {
    await cacheInvalidateTags(`notifications:${userId}`);
  }
}

export async function sendAnnouncementAction(
  _state: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const channelsValues = formData.getAll("channels").map(String);
  const sendInAppParam = formData.get("sendInApp");
  const sendWhatsAppParam = formData.get("sendWhatsApp");
  const sendPushParam = formData.get("sendPush");

  const sendInApp =
    channelsValues.includes("in_app") ||
    sendInAppParam === "on" ||
    sendInAppParam === "true";
  const sendWhatsApp =
    channelsValues.includes("whatsapp") ||
    sendWhatsAppParam === "on" ||
    sendWhatsAppParam === "true";
  const sendPush =
    channelsValues.includes("push") ||
    sendPushParam === "on" ||
    sendPushParam === "true";

  const sendEmailParam = formData.get("sendEmail");
  const sendEmail =
    channelsValues.includes("email") ||
    sendEmailParam === "on" ||
    sendEmailParam === "true";

  const rawAudienceType = formData.get("audienceType");
  const rawAudience = formData.get("audience"); // fallback for legacy select

  let audienceType = rawAudienceType ? String(rawAudienceType) : "all";
  let departmentId = formData.get("departmentId")
    ? String(formData.get("departmentId"))
    : undefined;
  let personId = formData.get("personId")
    ? String(formData.get("personId"))
    : undefined;

  // Backwards compatibility with single select "all" or "<departmentId>"
  if (!rawAudienceType && rawAudience) {
    const val = String(rawAudience);
    if (val === "all") {
      audienceType = "all";
    } else if (val.startsWith("person:")) {
      audienceType = "person";
      personId = val.replace("person:", "");
    } else {
      audienceType = "department";
      departmentId = val;
    }
  }

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audienceType,
    departmentId,
    personId,
    sendInApp,
    sendWhatsApp,
    sendPush,
    sendEmail,
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

  // Permission checks by audience type via centralized permission evaluator
  const { data } = parsed;

  if (data.audienceType === "all") {
    const allowed = await can("announcements", "sendAll");
    if (!allowed) {
      return {
        error:
          "Você não tem permissão para enviar avisos para toda a comunidade.",
      };
    }
  } else if (data.audienceType === "department") {
    const targetDeptId = data.departmentId!;
    const allowed = await can("announcements", "sendDepartment", {
      departmentId: targetDeptId,
    });
    if (!allowed) {
      return {
        error:
          "Você não tem permissão para enviar avisos para este departamento.",
      };
    }
  } else if (data.audienceType === "person") {
    const targetPersonId = data.personId!;
    const allowed = await can("announcements", "sendPerson", {
      targetPersonId,
    });
    if (!allowed) {
      return {
        error:
          "Você não tem permissão para enviar avisos para esta pessoa.",
      };
    }
  }

  // Check WhatsApp channel configuration if WhatsApp is selected
  if (data.sendWhatsApp) {
    const { config } = await getOrganizationEvolutionConfig(
      context.organization.id,
    );
    if (!config) {
      if (!data.sendInApp) {
        return {
          error:
            "O canal de WhatsApp não está ativo nesta igreja. Conecte sua instância em Configurações > Notificações.",
        };
      }
    }
  }

  // Resolve recipients
  type Recipient = {
    id: string;
    userId: string | null;
    phone: string | null;
    email: string | null;
    name: string | null;
  };

  let recipients: Recipient[] = [];

  if (data.audienceType === "person") {
    const target = await db.query.person.findFirst({
      where: and(
        eq(schema.person.id, data.personId!),
        eq(schema.person.organizationId, context.organization.id),
      ),
      columns: { id: true, userId: true, phone: true, email: true, name: true },
      with: {
        user: {
          columns: { email: true },
        },
      },
    });

    if (!target) {
      return { error: "Pessoa destinatária não foi encontrada." };
    }

    recipients = [
      {
        id: target.id,
        userId: target.userId,
        phone: target.phone,
        email: target.email || target.user?.email || null,
        name: target.name,
      },
    ];
  } else if (data.audienceType === "department") {
    const members = await db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.departmentId, data.departmentId!),
      with: {
        person: {
          columns: { id: true, userId: true, phone: true, email: true, name: true },
          with: {
            user: {
              columns: { email: true },
            },
          },
        },
      },
    });

    recipients = members
      .map((m) => ({
        id: m.person.id,
        userId: m.person.userId,
        phone: m.person.phone,
        email: m.person.email || m.person.user?.email || null,
        name: m.person.name,
      }))
      .filter((p) => p.userId !== context.session.user.id);
  } else {
    // all church members
    const allPeople = await db.query.person.findMany({
      where: eq(schema.person.organizationId, context.organization.id),
      columns: { id: true, userId: true, phone: true, email: true, name: true },
      with: {
        user: {
          columns: { email: true },
        },
      },
    });

    recipients = allPeople
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        phone: p.phone,
        email: p.email || p.user?.email || null,
        name: p.name,
      }))
      .filter((p) => p.userId !== context.session.user.id);
  }

  if (recipients.length === 0) {
    return {
      error: "Nenhum destinatário encontrado para o envio.",
    };
  }

  const announcementBatchId = randomUUID();

  try {
    // 1. Send in-app notifications
    if (data.sendInApp) {
      const userIds = [
        ...new Set(
          recipients
            .map((r) => r.userId)
            .filter((uid): uid is string => Boolean(uid)),
        ),
      ];

      if (userIds.length > 0) {
        await createNotifications({
          organizationId: context.organization.id,
          userIds,
          actorId: context.session.user.id,
          type: "announcement",
          title: data.title,
          body: data.body,
          href: "/dashboard/notifications",
        });
      }
    }

    // 2. Send WhatsApp notifications
    if (data.sendWhatsApp) {
      const { config } = await getOrganizationEvolutionConfig(
        context.organization.id,
      );

      if (config) {
        const recipientsWithPhone = recipients.filter((r) =>
          Boolean(r.phone),
        );

        for (const recipient of recipientsWithPhone) {
          await dispatchNotification({
            organizationId: context.organization.id,
            type: "announcement",
            title: data.title,
            body: data.body,
            href: "/dashboard/notifications",
            actorId: context.session.user.id,
            userId: recipient.userId,
            personId: recipient.id,
            phone: recipient.phone,
            email: recipient.email,
            name: recipient.name,
            batchId: announcementBatchId,
            channels: ["whatsapp"],
            metadata: {
              churchName: context.organization.name,
            },
          });
        }
      }
    }

    // 2.1 Send Email notifications via Brevo
    if (data.sendEmail) {
      const recipientsWithEmail = recipients.filter((r) => Boolean(r.email));

      for (const recipient of recipientsWithEmail) {
        await dispatchNotification({
          organizationId: context.organization.id,
          type: "announcement",
          title: data.title,
          body: data.body,
          href: "/dashboard/notifications",
          actorId: context.session.user.id,
          userId: recipient.userId,
          personId: recipient.id,
          phone: recipient.phone,
          email: recipient.email,
          name: recipient.name,
          batchId: announcementBatchId,
          channels: ["email"],
          metadata: {
            churchName: context.organization.name,
            authorName: context.session.user.name,
          },
        });
      }
    }

    // 3. Send Web Push notifications
    if (data.sendPush) {
      const userIds = [
        ...new Set(
          recipients
            .map((r) => r.userId)
            .filter((uid): uid is string => Boolean(uid)),
        ),
      ];

      for (const userId of userIds) {
        sendWebPushToUser(userId, {
          title: data.title,
          body: data.body,
          url: "/dashboard/notifications",
        }).catch((err) =>
          console.warn("Falha no disparo de push notification:", err),
        );
      }
    }
  } catch (error) {
    console.error("Erro ao enviar aviso multicanal:", error);
    return { error: "Não foi possível enviar o aviso. Tente novamente." };
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
