import { connection } from "next/server";

import { MobileHeaderLeading } from "@/components/app/mobile-header-leading";
import { requireOrganizationContext } from "@/lib/organizations";

export async function MobileHeaderLeadingLoader() {
  await connection();
  const { organization } = await requireOrganizationContext();

  return (
    <MobileHeaderLeading
      organizationLogo={organization.logo}
      organizationName={organization.name}
    />
  );
}

export function MobileHeaderLeadingFallback() {
  return (
    <div className="size-8 rounded-lg bg-muted/60 animate-pulse md:hidden" />
  );
}
