"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
