import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAdminRole } from "@/lib/format";

/**
 * Mantém o papel global usado pelo plugin admin do Better Auth alinhado aos
 * papéis da pessoa nas igrejas. A autorização de verdade continua sendo por
 * igreja nas server actions.
 */
export async function syncUserAdminRole(userId: string) {
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
