"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { syncPersonProfile } from "@/lib/people";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getSession } from "@/lib/session";

export type BirthdayFormState =
  | {
      error?: string;
      fieldErrors?: {
        birthday?: string[];
      };
      success?: boolean;
    }
  | undefined;

const birthdaySchema = z.object({
  birthday: birthdayFieldSchema,
});

const optionalImage = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .url("Informe uma URL válida.")
    .refine(
      (value) =>
        value.startsWith("http://") || value.startsWith("https://"),
      "Use uma URL http ou https.",
    )
    .optional(),
);

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  birthday: birthdayFieldSchema,
  image: optionalImage,
});

export type ProfileFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        birthday?: string[];
        image?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function updateProfileAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
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

  try {
    await auth.api.updateUser({
      body: {
        name: parsed.data.name,
        image: parsed.data.image,
      },
      headers: await headers(),
    });

    await updateBirthday(parsed.data.birthday);

    await syncPersonProfile(session.user.id, {
      name: parsed.data.name,
      ...(parsed.data.image !== undefined
        ? { image: parsed.data.image }
        : {}),
      ...(parsed.data.birthday !== undefined
        ? { birthday: parsed.data.birthday }
        : {}),
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil", error);
    return { error: "Não foi possível salvar seu perfil." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/birthdays");

  return { success: true };
}

export async function updateOwnBirthdayAction(
  _state: BirthdayFormState,
  formData: FormData,
): Promise<BirthdayFormState> {
  const parsed = birthdaySchema.safeParse({
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!parsed.data.birthday) {
    return {
      fieldErrors: { birthday: ["Informe sua data de nascimento."] },
    };
  }

  const session = await getSession();

  if (!session) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  try {
    await updateBirthday(parsed.data.birthday);
    await syncPersonProfile(session.user.id, {
      birthday: parsed.data.birthday,
    });
  } catch (error) {
    console.error("Erro ao atualizar aniversário", error);
    return { error: "Não foi possível salvar sua data de nascimento." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/birthdays");
  revalidatePath("/dashboard/members");

  return { success: true };
}
