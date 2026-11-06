"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOrganizationContext } from "@/lib/organizations";
import { getSession } from "@/lib/session";

export type ImpersonationActionResult = {
  ok: boolean;
  error?: string;
};

export async function impersonateMemberAction(
  userId: string,
): Promise<ImpersonationActionResult> {
  if (!userId) {
    return { ok: false, error: "Pessoa inválida." };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return { ok: false, error: "Sua igreja ativa não foi encontrada." };
  }

  if (!context.isAdmin) {
    return {
      ok: false,
      error: "Só administradores podem acessar o perfil de outra pessoa.",
    };
  }

  if (userId === context.session.user.id) {
    return { ok: false, error: "Você já está na sua própria conta." };
  }

  const membership = await db.query.member.findFirst({
    where: and(
      eq(schema.member.organizationId, context.organization.id),
      eq(schema.member.userId, userId),
    ),
    columns: { id: true },
  });

  if (!membership) {
    return {
      ok: false,
      error: "Essa pessoa não faz parte da igreja ativa.",
    };
  }

  try {
    const impersonation = await auth.api.impersonateUser({
      body: { userId },
      headers: await headers(),
    });

    // Mantém a igreja ativa do administrador mesmo quando a pessoa vista
    // pertence a mais de uma igreja.
    try {
      await db
        .update(schema.session)
        .set({ activeOrganizationId: context.organization.id })
        .where(eq(schema.session.id, impersonation.session.id));
    } catch (error) {
      console.error(
        "Erro ao definir a igreja ativa da impersonação",
        error,
      );
    }
  } catch (error) {
    console.error("Erro ao acessar como membro", error);
    return {
      ok: false,
      error: "Não foi possível entrar como essa pessoa. Tente novamente.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function stopImpersonatingAction(): Promise<ImpersonationActionResult> {
  const session = await getSession();

  if (!session?.session.impersonatedBy) {
    return { ok: false, error: "Você não está vendo como outra pessoa." };
  }

  try {
    await auth.api.stopImpersonating({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Erro ao sair da visualização como membro", error);
    return {
      ok: false,
      error: "Não foi possível voltar para a sua conta. Tente novamente.",
    };
  }

  revalidatePath("/dashboard");

  return { ok: true };
}
