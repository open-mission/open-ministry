"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";

export type ChurchBrandingFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        logo?: string[];
      };
      success?: boolean;
    }
  | undefined;

const optionalLogo = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .url("Informe uma URL válida para o logo.")
    .refine(
      (value) =>
        value.startsWith("http://") || value.startsWith("https://"),
      "Use uma URL http ou https.",
    )
    .optional(),
);

const churchBrandingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da igreja.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  logo: optionalLogo,
});

export async function updateChurchBrandingAction(
  _state: ChurchBrandingFormState,
  formData: FormData,
): Promise<ChurchBrandingFormState> {
  const parsed = churchBrandingSchema.safeParse({
    name: formData.get("name"),
    logo: formData.get("logo"),
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
      error: "Só administradores podem alterar o nome e o logo da igreja.",
    };
  }

  try {
    await db
      .update(schema.organization)
      .set({
        name: parsed.data.name,
        logo: parsed.data.logo ?? null,
      })
      .where(
        eq(schema.organization.id, context.organization.id),
      );
  } catch (error) {
    console.error("Erro ao atualizar identidade da igreja", error);
    return { error: "Não foi possível salvar a identidade da igreja." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/church");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");

  return { success: true };
}
