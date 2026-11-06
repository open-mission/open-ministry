import Link from "next/link";
import { ChurchIcon, LogOutIcon } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getInitials, roleLabel } from "@/lib/format";

type AppSidebarProps = {
  organizationName: string;
  role: string;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
};

export function AppSidebar({
  organizationName,
  role,
  user,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="OpenMinistry">
              <Link href="/dashboard">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ChurchIcon className="size-4" />
                </span>
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
        <SidebarGroup>
          <SidebarGroupLabel>Sua igreja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-lg border bg-sidebar-accent/40 p-2">
          <Avatar className="size-9">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {roleLabel(role)}
            </p>
          </div>
          <form action={signOutAction}>
            <input type="hidden" name="redirectTo" value="/" />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOutIcon />
            </Button>
          </form>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
