import Link from "next/link";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
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
  {
    href: "/dashboard/profile",
    label: "Perfil",
    icon: UserRoundIcon,
    exact: false,
  },
];

export function MobileNavShell({
  activeHref,
}: {
  activeHref?: string;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const isActive = activeHref
            ? item.exact
              ? activeHref === item.href
              : activeHref.startsWith(item.href)
            : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
