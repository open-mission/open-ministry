"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { syncUserAdminRole } from "@/lib/admin-role";
import { buildOrganizationSlug } from "@/lib/format";
import { ensurePersonForUser } from "@/lib/people";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getSession } from "@/lib/session";

export type ChurchFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        birthday?: string[];
      };
    }
  | undefined;

const churchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da igreja.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  birthday: birthdayFieldSchema,
});

export async function createChurchAction(
  _state: ChurchFormState,
  formData: FormData,
): Promise<ChurchFormState> {
  const parsed = churchSchema.safeParse({
    name: formData.get("name"),
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();

  if (!session) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  try {
    await updateBirthday(parsed.data.birthday);
    const organization = await auth.api.createOrganization({
      body: {
        name: parsed.data.name,
        slug: buildOrganizationSlug(parsed.data.name),
      },
      headers: await headers(),
    });

    if (organization) {
      await ensurePersonForUser(organization.id, {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        birthday: parsed.data.birthday ?? session.user.birthday ?? null,
      });
      await syncUserAdminRole(session.user.id);
    }
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
