"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import { buildDesktopSidebarNavigation } from "@/lib/modules/nav";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type SidebarNavProps = {
  groups?: NavGroup[];
  activeModuleKeys?: ModuleKey[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
};

type DesktopItem = ReturnType<
  typeof buildDesktopSidebarNavigation
>["primary"][number];

export function SidebarNav({
  groups: customGroups,
  activeModuleKeys = [],
  canManageJobs,
  canAccessWhatsApp,
  canAccessEmails,
}: SidebarNavProps) {
  const pathname = usePathname();

  const navigation = useMemo(
    () =>
      buildDesktopSidebarNavigation(activeModuleKeys, {
        canManageJobs,
        canAccessWhatsApp,
        canAccessEmails,
      }),
    [activeModuleKeys, canManageJobs, canAccessWhatsApp, canAccessEmails],
  );

  const isItemActive = (item: DesktopItem) => {
    if (item.matchPrefixes?.length) {
      return item.matchPrefixes.some(
        (prefix) =>
          pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
    }
    return isNavItemActive(item, pathname);
  };

  if (customGroups) {
    return <LegacyGroups groups={customGroups} pathname={pathname} />;
  }

  return (
    <>
      <SidebarGroup className="px-3 py-1 group-data-[collapsible=icon]:px-2">
        <SidebarGroupContent>
          {renderMenu(navigation.primary, isItemActive)}
        </SidebarGroupContent>
      </SidebarGroup>
      {navigation.secondary.length > 0 ? (
        <>
          <SidebarSeparator className="mx-4 my-2 group-data-[collapsible=icon]:mx-2.5" />
          <SidebarGroup className="px-3 py-1 group-data-[collapsible=icon]:px-2">
            <SidebarGroupContent>
              {renderMenu(navigation.secondary, isItemActive)}
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </>
  );
}

function renderMenu(
  items: DesktopItem[],
  isItemActive: (item: DesktopItem) => boolean,
) {
  return (
    <SidebarMenu className="gap-1.5">
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isItemActive(item)}
            tooltip={item.label}
            className={cn(
              "h-9 gap-2.5 rounded-lg px-2.5 text-[13px] group-data-[collapsible=icon]:mx-auto",
              item.badge
                ? item.badge.length > 2
                  ? "pr-14"
                  : "pr-8"
                : undefined,
            )}
          >
            <Link href={item.href} prefetch={true}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
          {item.badge ? (
            <SidebarMenuBadge
              className={cn(
                "peer-data-[size=default]/menu-button:top-1/2 right-2.5 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
                isItemActive(item) ? "bg-card" : "bg-muted",
              )}
            >
              {item.badge}
            </SidebarMenuBadge>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/** Fallback para consumidores que ainda fornecem grupos customizados. */
function LegacyGroups({
  groups,
  pathname,
}: {
  groups: NavGroup[];
  pathname: string;
}) {
  return (
    <>
      {groups.map((group) => (
        <Collapsible
          key={group.title}
          defaultOpen={true}
          className="group/collapsible"
        >
          <SidebarGroup className="px-3 py-1.5 group-data-[collapsible=icon]:px-2">
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
                <SidebarMenu className="gap-1.5">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isNavItemActive(item, pathname)}
                        tooltip={item.label}
                        className="h-9 gap-2.5 rounded-lg px-2.5 text-[13px] group-data-[collapsible=icon]:mx-auto"
                      >
                        <Link href={item.href} prefetch={true}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
