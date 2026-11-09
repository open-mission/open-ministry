import { connection } from "next/server";

import { AppSidebar } from "@/components/app/app-sidebar";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

export async function AppSidebarLoader() {
  await connection();

  const { organization, role, session, isAdmin } =
    await requireOrganizationContext();

  const [activeModuleKeys, isLeader] = await Promise.all([
    getUserAccessibleModuleKeys(
      organization.id,
      session.user.id,
      isAdmin,
    ),
    !isAdmin
      ? isUserLeaderInAnyDepartment(organization.id, session.user.id)
      : Promise.resolve(false),
  ]);

  const isAdminOrLeader = isAdmin || isLeader;

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
      activeModuleKeys={activeModuleKeys}
      canManageJobs={isAdminOrLeader}
      canAccessWhatsApp={isAdminOrLeader}
    />
  );
}
