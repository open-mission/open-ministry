import type { LucideIcon } from "lucide-react";
import {
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChurchIcon,
  ClipboardListIcon,
  HandHeartIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
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
        href: "/dashboard/calendar",
        label: "Agenda",
        icon: CalendarRangeIcon,
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

export function isNavItemActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}
