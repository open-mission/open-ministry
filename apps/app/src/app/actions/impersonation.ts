"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOrganizationContext } from "@/lib/organizations";
import { isBootstrapSuperAdminEmail, isSuperAdminRole } from "@/lib/platform/super-admin-emails";
/**
 * Expira o cookieCache (`session_data`) para que o próximo request reconstrua
 * a sessão a partir do banco com o novo session_token. Não chamamos getSession
 * depois de mutar a sessão: os headers da requisição ainda trazem o token
 * antigo e gravariam a sessão anterior no cookie da resposta.
 */
async function clearSessionCookieCache(): Promise<void> {
  const cookieStore = await cookies();
  const names = new Set<string>([
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
  ]);

  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.includes("session_data") ||
      cookie.name.endsWith(".session_data")
    ) {
      names.add(cookie.name);
    }
  }

  for (const name of names) {
    cookieStore.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      // Navegadores ignoram Set-Cookie de __Secure-*/__Host-* sem Secure.
      ...(name.startsWith("__Secure-") || name.startsWith("__Host-")
        ? { secure: true }
        : {}),
    });
  }
}

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

  // Leitura fresca: o cookieCache pode estar defasado em até 5 minutos.
  const currentSession = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (currentSession?.session.impersonatedBy) {
    return {
      ok: false,
      error: "Não é possível entrar como outra pessoa durante uma impersonação.",
    };
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

  // Defesa em profundidade: nunca impersonar operadores da plataforma, mesmo
  // que sejam membros da igreja ativa.
  const target = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { role: true, email: true },
  });
  if (
    isSuperAdminRole(target?.role) ||
    isBootstrapSuperAdminEmail(target?.email)
  ) {
    return {
      ok: false,
      error: "Esta pessoa não pode ser acessada por impersonação.",
    };
  }

  try {
    const requestHeaders = await headers();
    const impersonation = await auth.api.impersonateUser({
      body: { userId },
      headers: requestHeaders,
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

    // impersonateUser já trocou o session_token; expiramos o session_data
    // antigo para não reconstruir o cache com a sessão do administrador.
    await clearSessionCookieCache();
  } catch (error) {
    console.error("Erro ao acessar como membro", error);
    return {
      ok: false,
      error: "Não foi possível entrar como essa pessoa. Tente novamente.",
    };
  }

  revalidatePath("/");
  redirect("/");
}

export async function stopImpersonatingAction(): Promise<ImpersonationActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session?.session.impersonatedBy) {
    return { ok: false, error: "Você não está vendo como outra pessoa." };
  }

  try {
    const requestHeaders = await headers();
    await auth.api.stopImpersonating({
      headers: requestHeaders,
    });
    // stopImpersonating restaura o session_token do admin; o session_data da
    // sessão impersonada precisa ser descartado para não vazar para o admin.
    await clearSessionCookieCache();
  } catch (error) {
    console.error("Erro ao sair da visualização como membro", error);
    return {
      ok: false,
      error: "Não foi possível voltar para a sua conta. Tente novamente.",
    };
  }

  revalidatePath("/");

  return { ok: true };
}
