import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAdminRole } from "@/lib/format";
import {
  isBootstrapSuperAdminEmail,
  isSuperAdminRole,
} from "@/lib/platform/super-admin-emails";

/**
 * Mantém o papel global usado pelo plugin admin do Better Auth alinhado aos
 * papéis da pessoa nas igrejas. A autorização de verdade continua sendo por
 * igreja nas server actions.
 *
 * Um Super Admin nunca é rebaixado aqui: nem pelo papel persistido no banco,
 * nem quando seu e-mail faz parte do bootstrap via `.env`.
 */
export async function syncUserAdminRole(userId: string) {
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { role: true, email: true },
  });

  if (
    isSuperAdminRole(user?.role) ||
    isBootstrapSuperAdminEmail(user?.email)
  ) {
    return;
  }

  const memberships = await db.query.member.findMany({
    where: eq(schema.member.userId, userId),
    columns: { role: true },
  });

  const isAdmin = memberships.some((membership) =>
    isAdminRole(membership.role),
  );

  await db
    .update(schema.user)
    .set({ role: isAdmin ? "admin" : "user" })
    .where(eq(schema.user.id, userId));
}
