"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { actionErrorMessage } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { cacheInvalidateTags } from "@/lib/cache";
import { getOrganizationContext } from "@/lib/organizations";
import {
  findOrganizationMemberByEmail,
  findPersonByEmail,
  findPersonByUserId,
  getPerson,
  linkPersonToUser,
  normalizeEmail,
} from "@/lib/people";
import { birthdayFieldSchema } from "@/lib/profile";
import { getRequestOrigin } from "@/lib/request-origin";

export type PersonFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        email?: string[];
        phone?: string[];
        birthday?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type PersonActionResult = {
  ok: boolean;
  error?: string;
  link?: string;
  expiresAt?: string;
};

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max, message).optional(),
  );

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed.toLowerCase();
  },
  z.email("Informe um email válido.").optional(),
);

const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da pessoa.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: optionalEmail,
  phone: optionalText(30, "O telefone pode ter no máximo 30 caracteres."),
  birthday: birthdayFieldSchema,
});

const updatePersonSchema = personSchema.extend({
  personId: z.string().trim().min(1, "Pessoa inválida."),
});

async function getAdminContext() {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    } as const;
  }

  if (!context.isAdmin) {
    return {
      error: "Só administradores da igreja podem gerenciar pessoas.",
    } as const;
  }

  return { context } as const;
}

async function revalidatePeople(organizationId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/birthdays");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/schedules");

  if (organizationId) {
    await cacheInvalidateTags(`people:${organizationId}`);
  }
}

export async function createPersonAction(
  _state: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = personSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { error: result.error };
  }

  const organizationId = result.context.organization.id;

  if (parsed.data.email) {
    const existing = await findPersonByEmail(
      organizationId,
      parsed.data.email,
    );

    if (existing) {
      return {
        fieldErrors: {
          email: ["Já existe uma pessoa com esse email na igreja."],
        },
      };
    }
  }

  const personId = randomUUID();

  try {
    await db.insert(schema.person).values({
      id: personId,
      organizationId,
      name: parsed.data.name,
      email: normalizeEmail(parsed.data.email),
      phone: parsed.data.phone ?? null,
      birthday: parsed.data.birthday ?? null,
    });
  } catch (error) {
    console.error("Erro ao criar pessoa", error);
    return { error: "Não foi possível criar a pessoa." };
  }

  if (parsed.data.email) {
    const member = await findOrganizationMemberByEmail(
      organizationId,
      parsed.data.email,
    );

    if (member) {
      const alreadyLinked = await findPersonByUserId(
        organizationId,
        member.id,
      );

      if (!alreadyLinked) {
        await linkPersonToUser(organizationId, personId, member.id);
      }
    }
  }

  await revalidatePeople(organizationId);
  return { success: true };
}

export async function updatePersonAction(
  _state: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = updatePersonSchema.safeParse({
    personId: formData.get("personId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthday: formData.get("birthday"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { error: result.error };
  }

  const organizationId = result.context.organization.id;
  const person = await getPerson(organizationId, parsed.data.personId);

  if (!person) {
    return { error: "Pessoa não encontrada." };
  }

  if (!person.userId && parsed.data.email) {
    const existing = await findPersonByEmail(
      organizationId,
      parsed.data.email,
    );

    if (existing && existing.id !== person.id) {
      return {
        fieldErrors: {
          email: ["Já existe uma pessoa com esse email na igreja."],
        },
      };
    }
  }

  try {
    if (person.userId) {
      await db
        .update(schema.person)
        .set({
          phone: parsed.data.phone ?? null,
          birthday: parsed.data.birthday ?? null,
        })
        .where(eq(schema.person.id, person.id));

      await db
        .update(schema.user)
        .set({ birthday: parsed.data.birthday ?? null })
        .where(eq(schema.user.id, person.userId));
    } else {
      await db
        .update(schema.person)
        .set({
          name: parsed.data.name,
          email: normalizeEmail(parsed.data.email),
          phone: parsed.data.phone ?? null,
          birthday: parsed.data.birthday ?? null,
        })
        .where(eq(schema.person.id, person.id));
    }
  } catch (error) {
    console.error("Erro ao atualizar pessoa", error);
    return { error: "Não foi possível salvar a pessoa." };
  }

  await revalidatePeople(organizationId);
  return { success: true };
}

export async function deletePersonAction(
  personId: string,
): Promise<PersonActionResult> {
  if (!personId) {
    return { ok: false, error: "Pessoa inválida." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const person = await getPerson(
    result.context.organization.id,
    personId,
  );

  if (!person) {
    return { ok: false, error: "Pessoa não encontrada." };
  }

  if (person.userId) {
    return {
      ok: false,
      error:
        "Essa pessoa tem uma conta vinculada e não pode ser excluída. Edite os dados no perfil ou remova o vínculo.",
    };
  }

  try {
    await db.delete(schema.person).where(eq(schema.person.id, person.id));
  } catch (error) {
    console.error("Erro ao excluir pessoa", error);
    return { ok: false, error: "Não foi possível excluir a pessoa." };
  }

  await revalidatePeople(result.context.organization.id);
  return { ok: true };
}

export async function linkPersonAction(
  personId: string,
  userId: string,
): Promise<PersonActionResult> {
  if (!personId || !userId) {
    return { ok: false, error: "Escolha a pessoa e a conta para vincular." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const linked = await linkPersonToUser(
    result.context.organization.id,
    personId,
    userId,
  );

  if (!linked.ok) {
    return { ok: false, error: linked.error };
  }

  await revalidatePeople(result.context.organization.id);
  return { ok: true };
}

export async function invitePersonAction(
  personId: string,
): Promise<PersonActionResult> {
  if (!personId) {
    return { ok: false, error: "Pessoa inválida." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const organizationId = result.context.organization.id;
  const person = await getPerson(organizationId, personId);

  if (!person) {
    return { ok: false, error: "Pessoa não encontrada." };
  }

  if (person.userId) {
    return { ok: false, error: "Essa pessoa já tem uma conta vinculada." };
  }

  if (!person.email) {
    return {
      ok: false,
      error: "Cadastre um email antes de enviar o convite.",
    };
  }

  const requestHeaders = await headers();

  try {
    const invitation = await auth.api.createInvitation({
      body: {
        email: person.email,
        role: "member",
        organizationId,
      },
      headers: requestHeaders,
    });

    const origin = await getRequestOrigin(requestHeaders);

    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard");

    return {
      ok: true,
      link: `${origin}/accept-invitation/${invitation.id}`,
      expiresAt: new Date(invitation.expiresAt).toISOString(),
    };
  } catch (error) {
    return { ok: false, error: actionErrorMessage(error) };
  }
}
