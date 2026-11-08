import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
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

  return <MobileMenu activeModuleKeys={activeModuleKeys} />;
}
