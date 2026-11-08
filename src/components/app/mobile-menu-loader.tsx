import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";
import {
  buildAccessibleNavGroups,
  getUserAccessibleModuleKeys,
} from "@/lib/modules";
import { requireOrganizationContext } from "@/lib/organizations";

export async function MobileMenuLoader() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const activeModuleKeys = await getUserAccessibleModuleKeys(
    organization.id,
    session.user.id,
    isAdmin,
  );

  const groups = buildAccessibleNavGroups(activeModuleKeys);

  return <MobileMenu groups={groups} />;
}
