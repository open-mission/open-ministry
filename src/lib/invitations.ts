import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { invitation, member } from "@/db/schema";
import { isTenantDbEnabled, withTenantDb } from "@/db/tenant";

/**
 * Public invitation page: this lookup intentionally uses the admin connection
 * because the visitor has no session/JWT yet. Invitation IDs are high-entropy
 * and the page only renders masked data.
 */
export async function findInvitationDetails(invitationId: string) {
  if (!invitationId) {
    return null;
  }

  return db.query.invitation.findFirst({
    where: eq(invitation.id, invitationId),
    with: {
      organization: true,
      user: true,
    },
  });
}

export async function findMembership(
  organizationId: string,
  userId: string,
) {
  if (isTenantDbEnabled()) {
    return withTenantDb(async (tx, session) => {
      return tx.query.member.findFirst({
        where: and(
          eq(member.organizationId, organizationId),
          eq(member.userId, session.user.id),
        ),
      });
    });
  }

  return db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId),
    ),
  });
}
