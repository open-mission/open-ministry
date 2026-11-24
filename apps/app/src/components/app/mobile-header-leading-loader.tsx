import { connection } from "next/server";

import { MobileHeaderLeading } from "@/components/app/mobile-header-leading";
import { getHomeGreeting } from "@/lib/home-greeting";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId, personDisplayName } from "@/lib/people";

export async function MobileHeaderLeadingLoader() {
  await connection();
  const { organization, session } = await requireOrganizationContext();
  const person = await findPersonByUserId(organization.id, session.user.id);
  const displayName = person
    ? personDisplayName(person)
    : (session.user.name ?? "amigo");
  const firstName =
    displayName.trim().split(/\s+/)[0] || displayName || "amigo";

  return (
    <MobileHeaderLeading
      organizationLogo={organization.logo}
      organizationName={organization.name}
      greeting={getHomeGreeting()}
      firstName={firstName}
    />
  );
}

export function MobileHeaderLeadingFallback() {
  return (
    <div className="size-[34px] rounded-[10px] bg-muted/60 animate-pulse lg:hidden" />
  );
}
