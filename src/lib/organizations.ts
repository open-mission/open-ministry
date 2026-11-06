import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/format";
import { getSession, requireSession, type AuthSession } from "@/lib/session";

type FullOrganization = NonNullable<
  Awaited<ReturnType<typeof auth.api.getFullOrganization>>
>;

export type OrganizationContext = {
  session: AuthSession;
  organization: FullOrganization;
  role: string;
  isAdmin: boolean;
};

/**
 * Resolves the active organization and the current user's role in it. Returns
 * `null` when the user has no active organization or is no longer a member.
 */
export const getOrganizationContext = cache(
  async (): Promise<OrganizationContext | null> => {
    const session = await getSession();

    if (!session?.session.activeOrganizationId) {
      return null;
    }

    try {
      const organization = await auth.api.getFullOrganization({
        query: { organizationId: session.session.activeOrganizationId },
        headers: await headers(),
      });

      if (!organization) {
        return null;
      }

      const membership = organization.members.find(
        (member) => member.userId === session.user.id,
      );

      if (!membership) {
        return null;
      }

      return {
        session,
        organization,
        role: membership.role,
        isAdmin: isAdminRole(membership.role),
      };
    } catch {
      return null;
    }
  },
);

export async function requireOrganizationContext(): Promise<OrganizationContext> {
  await requireSession();

  const context = await getOrganizationContext();

  if (!context) {
    redirect("/onboarding");
  }

  return context;
}

export async function listUserMemberships(userId: string) {
  const memberships = await db.query.member.findMany({
    where: (member, { eq }) => eq(member.userId, userId),
    with: { organization: true },
  });

  return memberships.sort((a, b) =>
    a.organization.name.localeCompare(b.organization.name, "pt-BR"),
  );
}
