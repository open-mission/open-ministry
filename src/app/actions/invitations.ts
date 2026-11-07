"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { syncUserAdminRole } from "@/lib/admin-role";
import { findInvitationDetails } from "@/lib/invitations";
import {
  ensurePersonForEmail,
  ensurePersonForUser,
} from "@/lib/people";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getRequestOrigin } from "@/lib/request-origin";
import { getSession } from "@/lib/session";

export type InviteFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        email?: string[];
        role?: string[];
      };
      invitation?: {
        id: string;
        email: string;
        role: string;
        link: string;
        expiresAt: string;
      };
    }
  | undefined;

export type AcceptInvitationState =
  | {
      error?: string;
      fieldErrors?: {
        birthday?: string[];
      };
    }
  | undefined;

export type InvitationActionResult = {
  ok: boolean;
  error?: string;
};

const inviteSchema = z.object({
  name: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z
      .string()
      .max(80, "O nome pode ter no máximo 80 caracteres.")
      .optional(),
  ),
  email: z.email("Informe um email válido.").trim().toLowerCase(),
  role: z.enum(["member", "admin"], {
    error: "Escolha um papel válido.",
  }),
});

const acceptInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "Convite inválido."),
  birthday: birthdayFieldSchema,
});

export async function inviteMemberAction(
  _state: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();

  if (!session) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  if (!session.session.activeOrganizationId) {
    return { error: "Selecione uma igreja antes de enviar convites." };
  }

  const requestHeaders = await headers();

  try {
    await ensurePersonForEmail({
      organizationId: session.session.activeOrganizationId,
      email: parsed.data.email,
      name: parsed.data.name,
    });

    const invitation = await auth.api.createInvitation({
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        organizationId: session.session.activeOrganizationId,
        resend: true,
      },
      headers: requestHeaders,
    });

    const origin = await getRequestOrigin(requestHeaders);
    const link = `${origin}/accept-invitation/${invitation.id}`;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role ?? parsed.data.role,
        link,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
      },
    };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function cancelInvitationAction(
  invitationId: string,
): Promise<InvitationActionResult> {
  if (!invitationId) {
    return { ok: false, error: "Convite inválido." };
  }

  const session = await getSession();

  if (!session) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  }

  try {
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: await headers(),
    });
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");

  return { ok: true };
}

export async function acceptInvitationAction(
  _state: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const parsed = acceptInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await getSession();

  if (!session) {
    return { error: "Entre para aceitar o convite." };
  }

  const invitation = await findInvitationDetails(parsed.data.invitationId);
  const requestHeaders = await headers();

  try {
    await updateBirthday(parsed.data.birthday);
    await auth.api.acceptInvitation({
      body: { invitationId: parsed.data.invitationId },
      headers: requestHeaders,
    });

    await syncUserAdminRole(session.user.id);

    if (invitation) {
      await auth.api.setActiveOrganization({
        body: { organizationId: invitation.organizationId },
        headers: requestHeaders,
      });

      await ensurePersonForUser(invitation.organizationId, {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        birthday: parsed.data.birthday ?? session.user.birthday ?? null,
      });
    }
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  redirect("/dashboard");
}
