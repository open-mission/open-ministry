"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
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
  image: optionalImage,
});

export type AccountSettingsFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        username?: string[];
        birthday?: string[];
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

  try {
    await db
      .update(schema.user)
      .set({
        name: parsed.data.name,
        username: cleanUsername,
        displayUsername: cleanUsername,
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
