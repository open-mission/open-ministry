"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CakeIcon,
  CalendarDaysIcon,
  ChurchIcon,
  ClipboardListIcon,
  HandHeartIcon,
  LayoutDashboardIcon,
  SettingsIcon,
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
  {
    href: "/dashboard/church",
    label: "Igreja",
    icon: ChurchIcon,
    exact: false,
  },
  {
    href: "/dashboard/events",
    label: "Cultos e eventos",
    icon: CalendarDaysIcon,
    exact: false,
  },
  {
    href: "/dashboard/schedules",
    label: "Escalas",
    icon: ClipboardListIcon,
    exact: false,
  },
  {
    href: "/dashboard/birthdays",
    label: "Aniversariantes",
    icon: CakeIcon,
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Configurações",
    icon: SettingsIcon,
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
