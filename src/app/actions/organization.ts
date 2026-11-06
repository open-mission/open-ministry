"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { buildOrganizationSlug } from "@/lib/format";
import { getSession } from "@/lib/session";

export type ChurchFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
      };
    }
  | undefined;

const churchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da igreja.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
});

export async function createChurchAction(
  _state: ChurchFormState,
  formData: FormData,
): Promise<ChurchFormState> {
  const parsed = churchSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();

  if (!session) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  try {
    await auth.api.createOrganization({
      body: {
        name: parsed.data.name,
        slug: buildOrganizationSlug(parsed.data.name),
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function setActiveOrganizationAction(
  formData: FormData,
): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!organizationId) {
    redirect("/onboarding");
  }

  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });
  } catch {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
