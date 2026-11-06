import { AppSidebar } from "@/components/app/app-sidebar";
import { requireOrganizationContext } from "@/lib/organizations";

export async function AppSidebarLoader() {
  const { organization, role, session } = await requireOrganizationContext();

  return (
    <AppSidebar
      organizationName={organization.name}
      role={role}
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    />
  );
}
