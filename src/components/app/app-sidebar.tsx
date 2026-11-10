import Link from "next/link";
import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";

import type { NavGroup } from "@/components/app/nav-config";
import type { ModuleKey } from "@/lib/modules/types";
import { NavUser } from "@/components/app/nav-user";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { SidebarSettingsButton } from "@/components/app/sidebar-settings-button";
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="OpenMinistry">
              <Link href="/dashboard" prefetch={true}>
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
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-heading text-base leading-tight tracking-tight">
                    OpenMinistry
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {organizationName}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav
          groups={groups}
          activeModuleKeys={activeModuleKeys}
          canManageJobs={canManageJobs}
          canAccessWhatsApp={canAccessWhatsApp}
          canAccessEmails={canAccessEmails}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarSettingsButton />
        <NavUser user={user} role={role} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
