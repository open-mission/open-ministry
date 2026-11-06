import { connection } from "next/server";

import { AppSidebar } from "@/components/app/app-sidebar";
import { requireOrganizationContext } from "@/lib/organizations";

export async function AppSidebarLoader() {
  await connection();

  const { organization, role, session } = await requireOrganizationContext();

  return (
    <AppSidebar
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
