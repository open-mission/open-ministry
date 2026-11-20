import { connection } from "next/server";

import { UserMenuDrawer } from "@/components/app/user-menu-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizationContext } from "@/lib/organizations";
import { getSession } from "@/lib/session";

export async function UserMenuLoader() {
  await connection();

  const [session, orgContext] = await Promise.all([
    getSession(),
    getOrganizationContext(),
  ]);

  if (!session?.user) {
    return null;
  }

  return (
    <UserMenuDrawer
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      role={orgContext?.role ?? "member"}
      organizationName={orgContext?.organization.name}
    />
  );
}

export function UserMenuFallback() {
  return (
    <Skeleton className="size-8 sm:size-9 rounded-full shrink-0" />
  );
}
