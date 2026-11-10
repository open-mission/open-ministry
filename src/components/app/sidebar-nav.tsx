"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import { buildAccessibleNavGroups } from "@/lib/modules/nav";
import type { ModuleKey } from "@/lib/modules/types";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarNav({
  groups: customGroups,
  activeModuleKeys = [],
  canManageJobs,
  canAccessWhatsApp,
}: {
  groups?: NavGroup[];
  activeModuleKeys?: ModuleKey[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () =>
      customGroups ??
      buildAccessibleNavGroups(activeModuleKeys, {
        canManageJobs,
        canAccessWhatsApp,
      }),
    [customGroups, activeModuleKeys, canManageJobs, canAccessWhatsApp],
  );

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.title} className="py-1.5">
          <SidebarGroupLabel className="text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase">
            {group.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = isNavItemActive(item, pathname);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} prefetch={true}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
