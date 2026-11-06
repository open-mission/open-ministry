"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HandHeartIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: "/dashboard/members",
    label: "Pessoas",
    icon: UsersIcon,
    exact: false,
  },
  {
    href: "/dashboard/departments",
    label: "Departamentos",
    icon: HandHeartIcon,
    exact: false,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
