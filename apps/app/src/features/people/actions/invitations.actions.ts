"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { syncUserAdminRole } from "@/lib/admin-role";
import { cacheInvalidateTags } from "@/lib/cache";
import { findInvitationDetails } from "@/lib/invitations";
import {
  ensurePersonForEmail,
  ensurePersonForUser,
} from "@/lib/people";
import { birthdayFieldSchema, updateBirthday } from "@/lib/profile";
import { getRequestOrigin } from "@/lib/request-origin";
import { getSession } from "@/lib/session";
import { buildWhatsAppShareUrl } from "@/lib/message-templates";
import { renderOrganizationMessageText } from "@/lib/message-templates-server";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";

export type InviteFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        email?: string[];
        role?: string[];
        phone?: string[];
      };
      invitation?: {
        id: string;
        email: string;
        role: string;
        name?: string | null;
        phone?: string | null;
        churchName?: string;
        link: string;
        expiresAt: string;
        whatsappMessage?: string;
        saveContactMessage?: string;
        whatsappShareUrl?: string;
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
  phone: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(30, "Telefone inválido.").optional(),
  ),
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
    phone: formData.get("phone"),
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
    const orgId = session.session.activeOrganizationId;

    await ensurePersonForEmail({
      organizationId: orgId,
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone,
    });

    const invitation = await auth.api.createInvitation({
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        organizationId: orgId,
        resend: true,
      },
      headers: requestHeaders,
    });

    const origin = await getRequestOrigin(requestHeaders);
    const link = `${origin}/accept-invitation/${invitation.id}`;

    const orgRecord = await db.query.organization.findFirst({
      where: eq(schema.organization.id, orgId),
    });
    const churchName = orgRecord?.name || "Igreja";

    const { config: evolutionConfig } = await getOrganizationEvolutionConfig(orgId);

    const recipientName = parsed.data.name?.trim() || parsed.data.email.split("@")[0];

    const whatsappMessage = await renderOrganizationMessageText({
      organizationId: orgId,
      type: "invite_church",
      variables: {
        name: recipientName,
        church_name: churchName,
        link,
        role: parsed.data.role === "admin" ? "Administrador" : "Membro",
        church_phone: evolutionConfig?.instanceName || "",
      },
    });

    const saveContactMessage = await renderOrganizationMessageText({
      organizationId: orgId,
      type: "save_contact",
      variables: {
        name: recipientName,
        church_name: churchName,
        church_phone: evolutionConfig?.instanceName || "",
        whatsapp_name: evolutionConfig?.instanceName || churchName,
      },
    });

    const whatsappShareUrl = buildWhatsAppShareUrl({
      phone: parsed.data.phone,
      text: whatsappMessage,
    });

    await cacheInvalidateTags(`org:${orgId}`, `people:${orgId}`);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role ?? parsed.data.role,
        name: parsed.data.name ?? null,
        phone: parsed.data.phone ?? null,
        churchName,
        link,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        whatsappMessage,
        saveContactMessage,
        whatsappShareUrl,
      },
    };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function getInvitationWhatsAppMessagesAction(invitationId: string): Promise<{
  ok: boolean;
  inviteMessage?: string;
  saveContactMessage?: string;
  whatsappUrl?: string;
  phone?: string | null;
  name?: string | null;
  churchName?: string;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    return { ok: false, error: "Não autorizado." };
  }

  const details = await findInvitationDetails(invitationId);
  if (!details || details.organizationId !== session.session.activeOrganizationId) {
    return { ok: false, error: "Convite não encontrado." };
  }

  const origin = await getRequestOrigin(await headers());
  const link = `${origin}/accept-invitation/${details.id}`;

  const person = await db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, details.organizationId),
      eq(schema.person.email, details.email),
    ),
  });

  const { config: evolutionConfig } = await getOrganizationEvolutionConfig(details.organizationId);

  const recipientName = person?.name || details.email.split("@")[0];
  const churchName = details.organization.name;

  const inviteMessage = await renderOrganizationMessageText({
    organizationId: details.organizationId,
    type: "invite_church",
    variables: {
      name: recipientName,
      church_name: churchName,
      link,
      role: details.role === "admin" ? "Administrador" : "Membro",
      church_phone: evolutionConfig?.instanceName || "",
    },
  });

  const saveContactMessage = await renderOrganizationMessageText({
    organizationId: details.organizationId,
    type: "save_contact",
    variables: {
      name: recipientName,
      church_name: churchName,
      church_phone: evolutionConfig?.instanceName || "",
      whatsapp_name: evolutionConfig?.instanceName || churchName,
    },
  });

  const whatsappUrl = buildWhatsAppShareUrl({
    phone: person?.phone,
    text: inviteMessage,
  });

  return {
    ok: true,
    inviteMessage,
    saveContactMessage,
    whatsappUrl,
    phone: person?.phone ?? null,
    name: recipientName,
    churchName,
  };
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

    if (session.session.activeOrganizationId) {
      await cacheInvalidateTags(`org:${session.session.activeOrganizationId}`);
    }
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

      await cacheInvalidateTags(
        `org:${invitation.organizationId}`,
        `people:${invitation.organizationId}`,
      );
    }
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  redirect("/");
}
