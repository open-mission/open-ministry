"use server";

import { headers } from "next/headers";
import { desc, eq, like, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/platform/auth";
import {
  getBootstrapSuperAdminEmails,
  isBootstrapSuperAdminEmail,
  isSuperAdminRole,
} from "@/lib/platform/super-admin-emails";
import { recordPlatformAudit } from "@/lib/platform/audit";

export type PlatformOperatorView = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  isBootstrap: boolean;
  createdAt: Date;
};

export async function listPlatformOperatorsAction(): Promise<PlatformOperatorView[]> {
  await requireSuperAdmin("manage-operators");
  const rows = await db.query.user.findMany({
    where: like(schema.user.role, "%super_admin%"),
    orderBy: [desc(schema.user.createdAt)],
  });
  // O LIKE apenas afunila a consulta; a correspondência exata do token evita
  // que papéis como "not_super_admin" sejam contados como operadores.
  return rows.filter((user) => isSuperAdminRole(user.role)).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBootstrap: isBootstrapSuperAdminEmail(user.email),
    createdAt: user.createdAt,
  }));
}

export async function promotePlatformOperatorAction(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-operators");
  const normalized = email.trim().toLowerCase();
  const user = await db.query.user.findFirst({
    where: eq(schema.user.email, normalized),
  });
  if (!user) return { ok: false, error: "Usuário não encontrado." };
  if (!user.emailVerified) {
    return { ok: false, error: "Confirme o e-mail do usuário antes de promovê-lo." };
  }

  await auth.api.setRole({
    body: { userId: user.id, role: "super_admin" as never },
    headers: await headers(),
  });

  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "operator.promoted",
    targetType: "user",
    targetId: user.id,
    summary: `${normalized} promovido a Super Admin.`,
  });

  return { ok: true };
}

export async function revokePlatformOperatorAction(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperAdmin("manage-operators");
  if (userId === session.user.id) {
    return { ok: false, error: "Você não pode revogar seu próprio acesso." };
  }

  const operators = await listPlatformOperatorsAction();
  const target = operators.find((operator) => operator.id === userId);
  if (!target) return { ok: false, error: "Operador não encontrado." };

  if (target.isBootstrap || getBootstrapSuperAdminEmails().includes(target.email.toLowerCase())) {
    return { ok: false, error: "Operadores de bootstrap (.env) não podem ser revogados." };
  }

  class RevokeOperatorError extends Error {}
  try {
    await db.transaction(async (tx) => {
      // Lock de todas as linhas com o token exato `super_admin`: a contagem e a
      // revogação ficam atômicas, fechando a janela de corrida do último operador.
      const result = await tx.execute(sql`
        select id from "user"
        where role = 'super_admin'
           or role like 'super_admin,%'
           or role like '%,super_admin,%'
           or role like '%,super_admin'
        for update
      `);
      const lockedIds = ((result as unknown as { rows?: Array<{ id: string }> }).rows ?? []).map(
        (row) => row.id,
      );

      if (!lockedIds.includes(userId)) {
        throw new RevokeOperatorError("Operador não encontrado.");
      }
      if (lockedIds.length <= 1) {
        throw new RevokeOperatorError(
          "Não é possível remover o último Super Admin.",
        );
      }

      await tx
        .update(schema.user)
        .set({ role: "user" })
        .where(eq(schema.user.id, userId));
    });
  } catch (error) {
    if (error instanceof RevokeOperatorError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "operator.revoked",
    targetType: "user",
    targetId: userId,
    summary: `${target.email} teve o papel de Super Admin revogado.`,
  });

  return { ok: true };
}
