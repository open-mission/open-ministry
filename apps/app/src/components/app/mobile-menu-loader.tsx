import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";
import { toSerializableExploreDomains } from "@/components/app/domain-subtabs-data";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { buildDesktopSidebarNavigation } from "@/lib/modules/nav";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

export async function MobileMenuLoader() {
  await connection();

  const { organization, session, isAdmin } =
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
  const options = {
    canManageJobs: isAdminOrLeader,
    canAccessWhatsApp: isAdminOrLeader,
    canAccessEmails: isAdminOrLeader,
  };
  const navigation = buildDesktopSidebarNavigation(activeModuleKeys, options);

  return (
    <MobileMenu
      organizationName={organization.name}
      activeModuleKeys={activeModuleKeys}
      {...options}
      exploreDomains={toSerializableExploreDomains(navigation.primary)}
      exploreSecondary={toSerializableExploreDomains(navigation.secondary)}
    />
  );
}
