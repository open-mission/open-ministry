import Link from "next/link";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MenuIcon,
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
  onMenuClick,
  isMenuOpen = false,
}: {
  activeHref?: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden shadow-lg"
    >
      <div className="grid grid-cols-5">
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
                "flex flex-col items-center justify-center gap-1 py-2 text-[0.62rem] font-medium transition-colors select-none",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* 5º Item: Menu / 3 riscos que abre o sidebar no mobile */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu completo de navegação"
          aria-expanded={isMenuOpen}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 text-[0.62rem] font-medium transition-colors select-none cursor-pointer",
            isMenuOpen
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MenuIcon className="size-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
