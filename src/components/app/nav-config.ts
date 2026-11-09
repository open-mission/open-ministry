import type { LucideIcon } from "lucide-react";
import {
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  HandHeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
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
    title: "Comunicação",
    items: [
      {
        href: "/dashboard/announcements",
        label: "Avisos",
        icon: MegaphoneIcon,
        exact: false,
      },
    ],
  },
];

export const jobsNavItem: NavItem = {
  href: "/dashboard/jobs",
  label: "Tarefas agendadas",
  icon: LayersIcon,
  exact: false,
};

export const jobsNavGroup: NavGroup = {
  title: "Operações",
  items: [jobsNavItem],
};

export const whatsappNavItem: NavItem = {
  href: "/dashboard/whatsapp",
  label: "WhatsApp",
  icon: MessageSquareIcon,
  exact: false,
};

export const mobileNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Início",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: "/dashboard/schedules",
    label: "Escalas",
    icon: ClipboardListIcon,
    exact: false,
  },
  {
    href: "/dashboard/calendar",
    label: "Agenda",
    icon: CalendarDaysIcon,
    exact: false,
  },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function isMobileNavRoute(pathname: string) {
  return mobileNavItems.some((item) => item.href === pathname);
}

export function getParentHref(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 2) {
    return "/dashboard";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}
