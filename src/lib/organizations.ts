import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  isTenantDbEnabled,
  withTenantDb,
  type TenantTransaction,
} from "@/db/tenant";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/format";
import { getSession, requireSession, type AuthSession } from "@/lib/session";

type TenantOrganization = NonNullable<
  Awaited<ReturnType<typeof getTenantOrganization>>
>;

export type OrganizationContext = {
  session: AuthSession;
  organization: TenantOrganization;
  role: string;
  isAdmin: boolean;
};

async function getTenantOrganization(
  tx: TenantTransaction,
  organizationId: string,
) {
  return tx.query.organization.findFirst({
    where: eq(schema.organization.id, organizationId),
    with: {
      members: { with: { user: true } },
      invitations: true,
    },
  });
}

function buildContext(
  session: AuthSession,
  organization: TenantOrganization,
): OrganizationContext | null {
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
}

async function getOrganizationContextFromOwner(): Promise<OrganizationContext | null> {
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

    return buildContext(
      session,
      organization as unknown as TenantOrganization,
    );
  } catch {
    return null;
  }
}

/**
 * Resolves the active organization and the current user's role in it. Returns
 * `null` when the user has no active organization or is no longer a member.
 *
 * When `DATABASE_AUTHENTICATED_URL` is configured, the query runs under the
 * restricted RLS role with the verified JWT claims in the transaction.
 */
export const getOrganizationContext = cache(
  async (): Promise<OrganizationContext | null> => {
    if (!isTenantDbEnabled()) {
      return getOrganizationContextFromOwner();
    }

    return withTenantDb(async (tx, session) => {
      const organizationId = session.session.activeOrganizationId;

      if (!organizationId) {
        return null;
      }

      const organization = await getTenantOrganization(tx, organizationId);

      if (!organization) {
        return null;
      }

      return buildContext(session, organization);
    });
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

function sortMemberships<T extends { organization: { name: string } }>(
  memberships: T[],
) {
  return memberships.sort((a, b) =>
    a.organization.name.localeCompare(b.organization.name, "pt-BR"),
  );
}

export async function listUserMemberships(userId: string) {
  if (isTenantDbEnabled()) {
    const memberships = await withTenantDb(async (tx, session) => {
      return tx.query.member.findMany({
        where: eq(schema.member.userId, session.user.id),
        with: { organization: true },
      });
    });

    if (memberships) {
      return sortMemberships(memberships);
    }
  }

  const memberships = await db.query.member.findMany({
    where: (member, { eq }) => eq(member.userId, userId),
    with: { organization: true },
  });

  return sortMemberships(memberships);
}
