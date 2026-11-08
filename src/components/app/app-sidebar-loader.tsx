import { connection } from "next/server";

import { AppSidebar } from "@/components/app/app-sidebar";
import {
  buildAccessibleNavGroups,
  getUserAccessibleModuleKeys,
} from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

export async function AppSidebarLoader() {
  await connection();

  const { organization, role, session, isAdmin } =
    await requireOrganizationContext();

  const activeModuleKeys = await getUserAccessibleModuleKeys(
    organization.id,
    session.user.id,
    isAdmin,
  );

  const groups = buildAccessibleNavGroups(activeModuleKeys);

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
      groups={groups}
    />
  );
}
