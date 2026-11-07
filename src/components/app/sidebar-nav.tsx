"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, navGroups } from "@/components/app/nav-config";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {navGroups.map((group) => (
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
                      <Link href={item.href}>
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
