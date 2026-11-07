"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import { parseChurchMetadata, type ChurchPublicMetadata } from "@/lib/church";
import { getOrganizationContext } from "@/lib/organizations";

export type ChurchBrandingFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        logo?: string[];
        phone?: string[];
        website?: string[];
        address?: string[];
        instagram?: string[];
        youtube?: string[];
        facebook?: string[];
        description?: string[];
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

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `https://${trimmed}`;
    }
    return trimmed;
  },
  z.string().url("Informe uma URL válida.").optional(),
);

const churchBrandingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da igreja.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  logo: optionalLogo,
});

const churchDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da igreja.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  logo: optionalLogo,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  website: optionalUrl.or(z.literal("")),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().or(z.literal("")),
  youtube: z.string().trim().max(120).optional().or(z.literal("")),
  facebook: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
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

    await cacheInvalidateTags(`org:${context.organization.id}`);
  } catch (error) {
    console.error("Erro ao atualizar identidade da igreja", error);
    return { error: "Não foi possível salvar a identidade da igreja." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/church");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");

  return { success: true };
}

export async function updateChurchDetailsAction(
  _state: ChurchBrandingFormState,
  formData: FormData,
): Promise<ChurchBrandingFormState> {
  const parsed = churchDetailsSchema.safeParse({
    name: formData.get("name"),
    logo: formData.get("logo"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    address: formData.get("address"),
    instagram: formData.get("instagram"),
    youtube: formData.get("youtube"),
    facebook: formData.get("facebook"),
    description: formData.get("description"),
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
      error: "Apenas administradores podem atualizar os dados da igreja.",
    };
  }

  try {
    const existingOrg = await db.query.organization.findFirst({
      where: eq(schema.organization.id, context.organization.id),
    });

    const currentMeta = parseChurchMetadata(existingOrg?.metadata);
    const updatedMeta: ChurchPublicMetadata = {
      ...currentMeta,
      phone: parsed.data.phone || undefined,
      website: parsed.data.website || undefined,
      address: parsed.data.address || undefined,
      instagram: parsed.data.instagram || undefined,
      youtube: parsed.data.youtube || undefined,
      facebook: parsed.data.facebook || undefined,
      description: parsed.data.description || undefined,
    };

    await db
      .update(schema.organization)
      .set({
        name: parsed.data.name,
        logo: parsed.data.logo ?? null,
        metadata: JSON.stringify(updatedMeta),
      })
      .where(eq(schema.organization.id, context.organization.id));

    await cacheInvalidateTags(`org:${context.organization.id}`);
  } catch (error) {
    console.error("Erro ao atualizar dados da igreja:", error);
    return { error: "Não foi possível salvar os dados da igreja." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/church");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");

  return { success: true };
}
