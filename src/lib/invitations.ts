import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { invitation, member } from "@/db/schema";

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
  return db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId),
    ),
  });
}
