import { connection } from "next/server";

import { MobileNav } from "@/components/app/mobile-nav";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

export async function MobileNavLoader() {
  await connection();

  const { organization, session, isAdmin } = await requireOrganizationContext();

  const activeModuleKeys = await getUserAccessibleModuleKeys(
    organization.id,
    session.user.id,
    isAdmin,
  );

  return <MobileNav activeModuleKeys={activeModuleKeys} />;
}
