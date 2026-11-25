import "server-only";

import { headers } from "next/headers";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { recordPlatformAudit } from "@/lib/platform/audit";
import { getSession } from "@/lib/session";
import type { PlatformPermission } from "@/lib/platform/access-control";
import {
  isBootstrapSuperAdminEmail,
  isSuperAdminRole,
} from "@/lib/platform/super-admin-emails";

export class PlatformAccessError extends Error {
  constructor(message = "Acesso restrito a operadores da plataforma.") {
    super(message);
    this.name = "PlatformAccessError";
  }
}

type SessionLike = {
  user: { id: string; email?: string | null; emailVerified?: boolean | null; role?: string | null };
  session: { impersonatedBy?: string | null };
};

function isImpersonated(session: SessionLike): boolean {
  return Boolean(session.session?.impersonatedBy);
}

/**
 * Retorna a sessão de Super Admin ou null — nunca lança. Sessões em modo
 * impersonação são sempre rejeitadas, mesmo que o usuário seja super_admin.
 */
export async function getSuperAdminSession(): Promise<SessionLike | null> {
  const session = (await getSession()) as SessionLike | null;
  if (!session || isImpersonated(session)) return null;

  const role = session.user.role;
  const canBootstrap =
    Boolean(session.user.emailVerified) &&
    isBootstrapSuperAdminEmail(session.user.email);
  if (!isSuperAdminRole(role) && !canBootstrap) return null;

  return session;
}

/**
 * Guard único para todas as Server Actions de /platform.
 * - barra admins de igreja e sessões impersonadas;
 * - promove automaticamente e-mails do bootstrap (PLATFORM_SUPER_ADMIN_EMAILS)
 *   quando o e-mail está verificado;
 * - valida a permissão pedida com `auth.api.userHasPermission` nativo.
 */
export async function requireSuperAdmin(
  permission: PlatformPermission = "access",
): Promise<SessionLike> {
  const requestHeaders = await headers();
  let session = (await auth.api.getSession({ headers: requestHeaders })) as
    | SessionLike
    | null;

  if (!session) {
    throw new PlatformAccessError("Faça login para acessar a plataforma.");
  }

  if (isImpersonated(session)) {
    throw new PlatformAccessError(
      "Acesso indisponível durante uma sessão de impersonação.",
    );
  }

  const verified = Boolean(session.user.emailVerified);
  if (
    !isSuperAdminRole(session.user.role) &&
    verified &&
    isBootstrapSuperAdminEmail(session.user.email)
  ) {
    // O chamador ainda não tem a permissão `set-role`; usar auth.api.setRole
    // aqui Lancaria FORBIDDEN. Promovemos direto no banco (owner) e auditamos.
    await db
      .update(schema.user)
      .set({ role: "super_admin" })
      .where(eq(schema.user.id, session.user.id));

    try {
      await recordPlatformAudit({
        actorUserId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: "operator.bootstrap",
        targetType: "user",
        targetId: session.user.id,
        summary: "Primeiro acesso: operador promovido a Super Admin via bootstrap.",
      });
    } catch (error) {
      console.error("Falha ao auditar bootstrap de Super Admin", error);
    }

    session = (await auth.api.getSession({ headers: requestHeaders })) as SessionLike;
  }

  if (!isSuperAdminRole(session.user.role)) {
    throw new PlatformAccessError();
  }

  const result = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permissions: { platform: [permission] },
    },
    headers: requestHeaders,
  });

  if (!result.success) {
    throw new PlatformAccessError("Permissão insuficiente na plataforma.");
  }

  return session;
}
