import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  CheckSquare2Icon,
  ClipboardListIcon,
  HandHeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  Music2Icon,
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
        href: "/",
        label: "Visão geral",
        icon: LayoutDashboardIcon,
        exact: true,
      },
      {
        href: "/bible",
        label: "Bíblia",
        icon: BookOpenIcon,
        exact: false,
      },
      {
        href: "/tasks",
        label: "Tarefas",
        icon: CheckSquare2Icon,
        exact: false,
      },
    ],
  },
  {
    title: "Cultos & Escalas",
    items: [
      {
        href: "/calendar",
        label: "Agenda",
        icon: CalendarRangeIcon,
        exact: false,
      },
      {
        href: "/events",
        label: "Cultos e eventos",
        icon: CalendarDaysIcon,
        exact: false,
      },
      {
        href: "/schedules",
        label: "Escalas",
        icon: ClipboardListIcon,
        exact: false,
      },
      {
        href: "/availability",
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
        href: "/members",
        label: "Pessoas",
        icon: UsersIcon,
        exact: false,
      },
      {
        href: "/departments",
        label: "Departamentos",
        icon: HandHeartIcon,
        exact: false,
      },
      {
        href: "/birthdays",
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
        href: "/announcements",
        label: "Avisos",
        icon: MegaphoneIcon,
        exact: false,
      },
    ],
  },
];

export const jobsNavItem: NavItem = {
  href: "/jobs",
  label: "Tarefas agendadas",
  icon: LayersIcon,
  exact: false,
};

export const jobsNavGroup: NavGroup = {
  title: "Operações",
  items: [jobsNavItem],
};

export const whatsappNavItem: NavItem = {
  href: "/whatsapp",
  label: "WhatsApp",
  icon: MessageSquareIcon,
  exact: false,
};

export const emailsNavItem: NavItem = {
  href: "/emails",
  label: "Emails",
  icon: MailIcon,
  exact: false,
};

export const mobileNavItems: NavItem[] = [
  {
    href: "/",
    label: "Início",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: "/schedules",
    label: "Escalas",
    icon: ClipboardListIcon,
    exact: false,
  },
  {
    href: "/calendar",
    label: "Agenda",
    icon: CalendarDaysIcon,
    exact: false,
  },
  {
    href: "/songs",
    label: "Músicas",
    icon: Music2Icon,
    exact: false,
  },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.href === "/") {
    return pathname === "/" || pathname === "/dashboard";
  }
  if (item.exact) {
    return pathname === item.href || pathname === `/dashboard${item.href}`;
  }
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    pathname === `/dashboard${item.href}` ||
    pathname.startsWith(`/dashboard${item.href}/`)
  );
}

export function isMobileNavRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/dashboard" ||
    mobileNavItems.some(
      (item) =>
        pathname === item.href ||
        pathname === `/dashboard${item.href}`,
    )
  );
}

export function getParentHref(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 2) {
    return "/";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}
