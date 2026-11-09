import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { buildAccessibleNavGroups } from "@/lib/modules/nav";
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

  const canManageJobs = isAdmin || isLeader;
  const groups = buildAccessibleNavGroups(activeModuleKeys, { canManageJobs });

  return <MobileMenu activeModuleKeys={activeModuleKeys} groups={groups} />;
}
