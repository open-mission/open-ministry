"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChurchIcon,
  ClipboardListIcon,
  HandHeartIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    title: "Principal",
    items: [
      {
        href: "/dashboard",
        label: "Visão geral",
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ],
  },
  {
    title: "Cultos & Escalas",
    items: [
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
        href: "/dashboard/availability",
        label: "Disponibilidade",
        icon: CalendarCheckIcon,
        exact: false,
      },
    ],
  },
  {
    title: "Pessoas & Equipes",
    items: [
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
        href: "/dashboard/birthdays",
        label: "Aniversariantes",
        icon: CakeIcon,
        exact: false,
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        href: "/dashboard/church",
        label: "Igreja",
        icon: ChurchIcon,
        exact: false,
      },
      {
        href: "/dashboard/settings",
        label: "Configurações",
        icon: SettingsIcon,
        exact: false,
      },
    ],
  },
];

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
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

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
