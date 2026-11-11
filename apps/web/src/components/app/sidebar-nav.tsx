"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import { buildAccessibleNavGroups } from "@/lib/modules/nav";
import type { ModuleKey } from "@/lib/modules/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  canAccessEmails,
}: {
  groups?: NavGroup[];
  activeModuleKeys?: ModuleKey[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () =>
      customGroups ??
      buildAccessibleNavGroups(activeModuleKeys, {
        canManageJobs,
        canAccessWhatsApp,
        canAccessEmails,
      }),
    [
      customGroups,
      activeModuleKeys,
      canManageJobs,
      canAccessWhatsApp,
      canAccessEmails,
    ],
  );

  return (
    <>
      {groups.map((group) => (
        <Collapsible
          key={group.title}
          defaultOpen={true}
          className="group/collapsible"
        >
          <SidebarGroup className="py-1.5">
            <SidebarGroupLabel
              asChild
              className="text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase transition-colors hover:text-foreground cursor-pointer select-none"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <span>{group.title}</span>
                <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
