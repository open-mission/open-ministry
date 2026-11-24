"use server";

import { headers } from "next/headers";
import { desc, eq, like } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/platform/auth";
import {
  getBootstrapSuperAdminEmails,
  isBootstrapSuperAdminEmail,
} from "@/lib/platform/super-admin-emails";
import { recordPlatformAudit } from "./audit";

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
  return rows.map((user) => ({
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
  const operators = await listPlatformOperatorsAction();
  const target = operators.find((operator) => operator.id === userId);
  if (!target) return { ok: false, error: "Operador não encontrado." };

  if (target.isBootstrap || getBootstrapSuperAdminEmails().includes(target.email.toLowerCase())) {
    return { ok: false, error: "Operadores de bootstrap (.env) não podem ser revogados." };
  }
  if (operators.length <= 1) {
    return { ok: false, error: "Não é possível remover o último Super Admin." };
  }

  await auth.api.setRole({
    body: { userId, role: "user" as never },
    headers: await headers(),
  });

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
