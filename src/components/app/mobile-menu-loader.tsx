import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";
import { requireOrganizationContext } from "@/lib/organizations";

export async function MobileMenuLoader() {
  await connection();

  const { organization, role, session } = await requireOrganizationContext();

  return (
    <MobileMenu
      organizationName={organization.name}
      organizationLogo={organization.logo}
      role={role}
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    />
  );
}
