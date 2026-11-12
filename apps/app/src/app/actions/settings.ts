"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  checkEvolutionConnection,
  configureEvolutionWebhook,
  formatPhoneNumberForEvolution,
  sendEvolutionTextMessage,
} from "@/lib/evolution-api";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  listEvolutionMessageLogs,
  retryWhatsAppMessage,
  retryFailedWhatsAppMessages,
  type EvolutionMessageLogItem,
} from "@/lib/notification-service";
import { getOrganizationContext, requireOrganizationContext } from "@/lib/organizations";
import { syncPersonProfile, listPeople } from "@/lib/people";
import {
  isUserLeaderInAnyDepartment,
  listDepartments,
  listUserLeaderDepartments,
} from "@/lib/departments";
import { getOrganizationMessageTemplates } from "@/lib/message-templates-server";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getSession } from "@/lib/session";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { getOrganizationPermissionSettingsAction } from "@/app/actions/permissions";

export type SessionItem = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export type PasskeyViewItem = {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string | null;
};

export async function getUserPasskeysAction(): Promise<PasskeyViewItem[]> {
  const session = await getSession();
  if (!session) return [];

  const keys = await db.query.passkey.findMany({
    where: eq(schema.passkey.userId, session.user.id),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    deviceType: k.deviceType,
    backedUp: k.backedUp,
    createdAt: k.createdAt ? k.createdAt.toISOString() : null,
  }));
}

export async function deletePasskeyAction(
  passkeyId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Não autorizado." };
  }

  try {
    await db
      .delete(schema.passkey)
      .where(
        and(
          eq(schema.passkey.id, passkeyId),
          eq(schema.passkey.userId, session.user.id),
        ),
      );

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir passkey", error);
    return { success: false, error: "Não foi possível remover a chave de acesso." };
  }
}

export async function getUserSessionsAction(): Promise<SessionItem[]> {
  const session = await getSession();
  if (!session) return [];

  const sessions = await db.query.session.findMany({
    where: eq(schema.session.userId, session.user.id),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt.toISOString(),
    isCurrent: s.id === session.session.id,
  }));
}

export async function revokeSessionAction(
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  const current = await getSession();
  if (!current) {
    return { success: false, error: "Sessão não autorizada." };
  }

  if (sessionId === current.session.id) {
    return {
      success: false,
      error: "Você não pode revogar sua sessão atual por aqui. Use o botão de Sair.",
    };
  }

  try {
    await db
      .delete(schema.session)
      .where(
        and(
          eq(schema.session.id, sessionId),
          eq(schema.session.userId, current.user.id),
        ),
      );

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao revogar sessão", error);
    return { success: false, error: "Não foi possível revogar a sessão." };
  }
}

export async function revokeOtherSessionsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const current = await getSession();
  if (!current) {
    return { success: false, error: "Sessão não autorizada." };
  }

  try {
    await db
      .delete(schema.session)
      .where(
        and(
          eq(schema.session.userId, current.user.id),
          ne(schema.session.id, current.session.id),
        ),
      );

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao revogar outras sessões", error);
    return { success: false, error: "Não foi possível revogar outras sessões." };
  }
}

const optionalImage = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .url("Informe uma URL válida.")
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "Use uma URL http ou https.",
    )
    .optional(),
);

const accountSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O nome de usuário precisa ter pelo menos 3 caracteres.")
    .max(30, "O nome de usuário pode ter no máximo 30 caracteres.")
    .regex(
      /^@?[a-z0-9_.-]+$/,
      "Use apenas letras minúsculas, números, pontos, hífens ou sublinhados.",
    )
    .optional()
    .or(z.literal("")),
  birthday: birthdayFieldSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  image: optionalImage,
});

export type AccountSettingsFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        username?: string[];
        birthday?: string[];
        phone?: string[];
        image?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function updateAccountSettingsAction(
  _state: AccountSettingsFormState,
  formData: FormData,
): Promise<AccountSettingsFormState> {
  const parsed = accountSettingsSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    birthday: formData.get("birthday"),
    phone: formData.get("phone"),
    image: formData.get("image"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();
  if (!session) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const cleanUsername = parsed.data.username
    ? parsed.data.username.replace(/^@/, "").trim().toLowerCase()
    : null;

  // Check unique username if provided
  if (cleanUsername) {
    const existing = await db.query.user.findFirst({
      where: and(
        eq(schema.user.username, cleanUsername),
        ne(schema.user.id, session.user.id),
      ),
      columns: { id: true },
    });

    if (existing) {
      return {
        fieldErrors: {
          username: ["Este nome de usuário já está sendo usado por outra pessoa."],
        },
      };
    }
  }

  const cleanPhone = parsed.data.phone ? parsed.data.phone.trim() : null;

  try {
    await db
      .update(schema.user)
      .set({
        name: parsed.data.name,
        username: cleanUsername,
        displayUsername: cleanUsername,
        phone: cleanPhone,
        image: parsed.data.image ?? null,
      })
      .where(eq(schema.user.id, session.user.id));

    await updateBirthday(parsed.data.birthday);

    await syncPersonProfile(session.user.id, {
      name: parsed.data.name,
      ...(parsed.data.image !== undefined ? { image: parsed.data.image } : {}),
      ...(parsed.data.birthday !== undefined
        ? { birthday: parsed.data.birthday }
        : {}),
      phone: cleanPhone,
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações da conta", error);
    return { error: "Não foi possível atualizar as configurações da conta." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/birthdays");

  return { success: true };
}

export type EvolutionSettingsView = {
  id: string | null;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  isActive: boolean;
  webhookSecret?: string | null;
  webhookUrl?: string;
};

export async function getEvolutionSettingsAction(): Promise<EvolutionSettingsView> {
  const context = await getOrganizationContext();
  if (!context) {
    return {
      id: null,
      apiUrl: "",
      apiKey: "",
      instanceName: "",
      isActive: false,
    };
  }

  // Gate no servidor: a UI filtra por papel, mas a action é um endpoint
  // chamável — sem esse check, qualquer membro receberia a apiKey do gateway
  // de WhatsApp e a URL de webhook com segredo.
  if (!context.isAdmin) {
    return {
      id: null,
      apiUrl: "",
      apiKey: "",
      instanceName: "",
      isActive: false,
    };
  }

  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });

  let secret = channel?.webhookSecret;
  if (channel && !secret) {
    secret = randomUUID();
    await db
      .update(schema.organizationNotificationChannel)
      .set({ webhookSecret: secret })
      .where(eq(schema.organizationNotificationChannel.id, channel.id));
  }

  const baseUrl = getAppBaseUrl();
  const webhookUrl = secret
    ? `${baseUrl.replace(/\/+$/, "")}/api/webhooks/evolution?token=${secret}`
    : `${baseUrl.replace(/\/+$/, "")}/api/webhooks/evolution`;

  // apiKey é cifrada em repouso (SECRETS_ENCRYPTION_KEY); valores legados sem
  // prefixo passam direto até serem re-salvos.
  const apiKey = channel ? (decryptSecret(channel.apiKey) ?? "") : "";

  return {
    id: channel?.id ?? null,
    apiUrl: channel?.apiUrl ?? "",
    apiKey,
    instanceName: channel?.instanceName ?? "",
    isActive: channel?.isActive ?? true,
    webhookSecret: secret ?? null,
    webhookUrl,
  };
}

const evolutionSettingsSchema = z.object({
  apiUrl: z.string().trim().url("Informe uma URL válida (ex.: https://api.evolution.exemplo.com)"),
  apiKey: z.string().trim().min(1, "Informe a chave de API (apikey)"),
  instanceName: z.string().trim().min(1, "Informe o nome da instância"),
  isActive: z.boolean(),
});

export type EvolutionSettingsFormState =
  | {
      error?: string;
      fieldErrors?: {
        apiUrl?: string[];
        apiKey?: string[];
        instanceName?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function saveEvolutionSettingsAction(
  _state: EvolutionSettingsFormState,
  formData: FormData,
): Promise<EvolutionSettingsFormState> {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sua sessão expirou." };
  }

  if (!context.isAdmin) {
    return { error: "Apenas administradores podem configurar canais de notificação." };
  }

  const parsed = evolutionSettingsSchema.safeParse({
    apiUrl: formData.get("apiUrl"),
    apiKey: formData.get("apiKey"),
    instanceName: formData.get("instanceName"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await db.query.organizationNotificationChannel.findFirst({
      where: and(
        eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
        eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
      ),
    });

    const encryptedApiKey = encryptSecret(parsed.data.apiKey);

    if (existing) {
      await db
        .update(schema.organizationNotificationChannel)
        .set({
          apiUrl: parsed.data.apiUrl,
          apiKey: encryptedApiKey,
          instanceName: parsed.data.instanceName,
          isActive: parsed.data.isActive,
        })
        .where(eq(schema.organizationNotificationChannel.id, existing.id));
    } else {
      await db.insert(schema.organizationNotificationChannel).values({
        id: randomUUID(),
        organizationId: context.organization.id,
        channel: "evolution_whatsapp",
        apiUrl: parsed.data.apiUrl,
        apiKey: encryptedApiKey,
        instanceName: parsed.data.instanceName,
        webhookSecret: randomUUID(),
        isActive: parsed.data.isActive,
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações da Evolution API", error);
    return { error: "Não foi possível salvar as configurações da Evolution API." };
  }
}

export async function testEvolutionConnectionAction(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{
  ok: boolean;
  state?: string;
  error?: string;
  details?: {
    instanceName?: string;
    whatsappName?: string;
    phoneJid?: string;
    authType?: "global" | "instance";
  };
}> {
  const context = await getOrganizationContext();
  if (!context || !context.isAdmin) {
    return { ok: false, error: "Apenas administradores podem testar a conexão." };
  }

  return checkEvolutionConnection({
    apiUrl,
    apiKey,
    instanceName,
  });
}

export async function sendTestEvolutionMessageAction(
  recipientPhone: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await getOrganizationContext();
  if (!context || !context.isAdmin) {
    return { ok: false, error: "Apenas administradores podem enviar mensagens de teste." };
  }

  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });

  if (!channel || !channel.apiUrl || !channel.apiKey || !channel.instanceName) {
    return { ok: false, error: "Configure e salve as credenciais da Evolution API primeiro." };
  }

  const formatted = formatPhoneNumberForEvolution(recipientPhone);
  if (!formatted) {
    return { ok: false, error: "Número de WhatsApp inválido." };
  }

  const messageText =
    `✅ *Teste de Conexão - OpenMinistry*\n\n` +
    `Parabéns! Sua integração da igreja *${context.organization.name}* com a *Evolution API Go* está conectada e funcionando com sucesso!\n\n` +
    `Enviado em: ${new Date().toLocaleString("pt-BR")}`;

  const result = await sendEvolutionTextMessage({
    config: {
      apiUrl: channel.apiUrl,
      apiKey: decryptSecret(channel.apiKey) ?? "",
      instanceName: channel.instanceName,
    },
    to: formatted,
    text: messageText,
  });

  return result;
}

export async function configureEvolutionWebhookAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const context = await getOrganizationContext();
  if (!context || !context.isAdmin) {
    return { ok: false, error: "Apenas administradores podem configurar webhooks." };
  }

  const settings = await getEvolutionSettingsAction();
  if (!settings.apiUrl || !settings.apiKey || !settings.instanceName || !settings.webhookUrl) {
    return { ok: false, error: "Salve as configurações da Evolution API primeiro." };
  }

  const res = await configureEvolutionWebhook({
    config: {
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey,
      instanceName: settings.instanceName,
    },
    webhookUrl: settings.webhookUrl,
  });

  if (res.ok) {
    revalidatePath("/dashboard/settings");
  }

  return res;
}

export async function getEvolutionMessageLogsAction(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  type?: string;
}): Promise<{ logs: EvolutionMessageLogItem[]; total: number }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { logs: [], total: 0 };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : false;

  if (!context.isAdmin && !isLeader) {
    return { logs: [], total: 0 };
  }

  if (!context.isAdmin) {
    // Escopo de líder: apenas logs de pessoas dos departamentos que lidera —
    // o gate acima só verifica o papel, não restringe o volume.
    const ledDepartments = await listUserLeaderDepartments(
      context.organization.id,
      context.session.user.id,
    );
    const departmentIds = ledDepartments.map((department) => department.id);

    if (departmentIds.length === 0) {
      return { logs: [], total: 0 };
    }

    return listEvolutionMessageLogs(context.organization.id, {
      ...options,
      departmentIds,
    });
  }

  return listEvolutionMessageLogs(context.organization.id, options);
}

export async function retryEvolutionMessageAction(
  logId: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : false;

  if (!context.isAdmin && !isLeader) {
    return {
      ok: false,
      error: "Apenas administradores ou líderes de departamento podem reenviar mensagens.",
    };
  }

  if (!context.isAdmin) {
    // Escopo de líder: só pode reenviar mensagens de pessoas dos departamentos
    // que lidera. Logs de broadcast sem pessoa vinculada ficam fora do escopo.
    const ledDepartments = await listUserLeaderDepartments(
      context.organization.id,
      context.session.user.id,
    );

    if (ledDepartments.length === 0) {
      return { ok: false, error: "Você não lidera nenhum departamento." };
    }

    const log = await db.query.whatsappMessageLog.findFirst({
      where: and(
        eq(schema.whatsappMessageLog.id, logId),
        eq(schema.whatsappMessageLog.organizationId, context.organization.id),
      ),
      columns: { personId: true },
    });

    const inScope = log?.personId
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

    if (!inScope) {
      return {
        ok: false,
        error: "Você só pode reenviar mensagens do seu departamento.",
      };
    }
  }

  const res = await retryWhatsAppMessage(logId, context.organization.id);
  revalidatePath("/dashboard/whatsapp");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/announcements");
  return res;
}

export async function retryAllFailedEvolutionMessagesAction(
  batchId?: string,
): Promise<{ total: number; sent: number; failed: number }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { total: 0, sent: 0, failed: 0 };
  }

  const isLeader = !context.isAdmin
    ? await isUserLeaderInAnyDepartment(
        context.organization.id,
        context.session.user.id,
      )
    : false;

  if (!context.isAdmin && !isLeader) {
    return { total: 0, sent: 0, failed: 0 };
  }

  // Escopo de líder: o reenvio em massa fica restrito às pessoas dos
  // departamentos que lidera (admins continuam com visão da organização).
  let departmentIds: string[] | undefined;
  if (!context.isAdmin) {
    const ledDepartments = await listUserLeaderDepartments(
      context.organization.id,
      context.session.user.id,
    );

    if (ledDepartments.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    departmentIds = ledDepartments.map((department) => department.id);
  }

  const res = await retryFailedWhatsAppMessages(
    context.organization.id,
    batchId,
    departmentIds,
  );
  revalidatePath("/dashboard/whatsapp");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/announcements");
  return res;
}

export async function getSettingsDialogDataAction() {
  const { organization, session, role, isAdmin } =
    await requireOrganizationContext();

  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
  });

  const [initialSessions, initialPasskeys, people, departments] =
    await Promise.all([
      getUserSessionsAction(),
      getUserPasskeysAction(),
      listPeople(organization.id),
      listDepartments(organization.id),
    ]);

  const [evolutionSettings, messageTemplates, permissionSettingsResult] = isAdmin
    ? await Promise.all([
        getEvolutionSettingsAction(),
        getOrganizationMessageTemplates(organization.id),
        getOrganizationPermissionSettingsAction(),
      ])
    : [null, [], null];

  const permissionSettings =
    permissionSettingsResult && permissionSettingsResult.ok
      ? permissionSettingsResult.data
      : null;

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      metadata: organization.metadata,
    },
    role,
    isAdmin,
    userData: {
      name: userRecord?.name ?? session.user.name,
      username: userRecord?.username ?? null,
      email: userRecord?.email ?? session.user.email,
      birthday: userRecord?.birthday ?? session.user.birthday ?? null,
      phone: userRecord?.phone ?? null,
      image: userRecord?.image ?? session.user.image ?? null,
    },
    calendarPreferences: {
      weekStartsOn: (userRecord?.weekStartsOn === 1 ? 1 : 0) as 0 | 1,
      timezone: userRecord?.timezone || "America/Sao_Paulo",
    },
    initialSessions,
    initialPasskeys,
    peopleCount: people.length,
    departmentsCount: departments.length,
    evolutionSettings,
    messageTemplates,
    permissionSettings,
  };
}

