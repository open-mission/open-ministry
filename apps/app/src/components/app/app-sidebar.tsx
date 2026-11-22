import Link from "next/link";
import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";

import type { NavGroup } from "@/components/app/nav-config";
import type { ModuleKey } from "@/lib/modules/types";
import { NavUser } from "@/components/app/nav-user";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  organizationName: string;
  organizationLogo: string | null;
  role: string;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  activeModuleKeys?: ModuleKey[];
  groups?: NavGroup[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
};

export function AppSidebar({
  organizationName,
  organizationLogo,
  role,
  user,
  activeModuleKeys,
  groups,
  canManageJobs,
  canAccessWhatsApp,
  canAccessEmails,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="OpenMinistry" className="h-auto gap-2.5 rounded-lg px-1.5 py-1 group-data-[collapsible=icon]:mx-auto">
              <Link href="/" prefetch={true}>
                {organizationLogo ? (
                  <Avatar className="size-8 shrink-0 rounded-lg">
                    <AvatarImage
                      src={organizationLogo}
                      alt={`Logo de ${organizationName}`}
                    />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      <OpenMinistrySymbol className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <OpenMinistrySymbol className="size-4" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-[13px] font-semibold leading-tight text-sidebar-foreground">
                    {organizationName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    OpenMinistry
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-1 pb-2">
        <SidebarNav
          groups={groups}
          activeModuleKeys={activeModuleKeys}
          canManageJobs={canManageJobs}
          canAccessWhatsApp={canAccessWhatsApp}
          canAccessEmails={canAccessEmails}
        />
      </SidebarContent>

      <SidebarFooter className="px-3 pt-2 pb-3.5 group-data-[collapsible=icon]:px-2">
        <NavUser user={user} role={role} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
