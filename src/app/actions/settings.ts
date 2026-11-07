"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  checkEvolutionConnection,
  formatPhoneNumberForEvolution,
  sendEvolutionTextMessage,
} from "@/lib/evolution-api";
import { getOrganizationContext } from "@/lib/organizations";
import { syncPersonProfile } from "@/lib/people";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getSession } from "@/lib/session";

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

  const channel = await db.query.organizationNotificationChannel.findFirst({
    where: and(
      eq(schema.organizationNotificationChannel.organizationId, context.organization.id),
      eq(schema.organizationNotificationChannel.channel, "evolution_whatsapp"),
    ),
  });

  return {
    id: channel?.id ?? null,
    apiUrl: channel?.apiUrl ?? "",
    apiKey: channel?.apiKey ?? "",
    instanceName: channel?.instanceName ?? "",
    isActive: channel?.isActive ?? true,
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

    if (existing) {
      await db
        .update(schema.organizationNotificationChannel)
        .set({
          apiUrl: parsed.data.apiUrl,
          apiKey: parsed.data.apiKey,
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
        apiKey: parsed.data.apiKey,
        instanceName: parsed.data.instanceName,
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
      apiKey: channel.apiKey,
      instanceName: channel.instanceName,
    },
    to: formatted,
    text: messageText,
  });

  return result;
}

