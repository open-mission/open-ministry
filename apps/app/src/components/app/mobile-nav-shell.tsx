import Link from "next/link";
import { CompassIcon } from "lucide-react";

import {
  isMobileNavRoute,
  isNavItemActive,
  mobileNavItems,
  type NavItem,
} from "@/components/app/nav-config";
import { cn } from "@/lib/utils";

export function MobileNavShell({
  activeHref,
  onMenuClick,
  isMenuOpen = false,
  items = mobileNavItems,
}: {
  activeHref?: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  items?: NavItem[];
}) {
  const isMenuActive =
    isMenuOpen || (activeHref ? !isMobileNavRoute(activeHref) : false);
  const colCount = items.length + 1; // +1 para o botão Explorar
  const gridColsClass =
    colCount <= 2
      ? "grid-cols-2"
      : colCount === 3
        ? "grid-cols-3"
        : colCount === 4
          ? "grid-cols-4"
          : "grid-cols-5";

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(23,38,31,0.35)] lg:hidden"
    >
      <div className={cn("grid items-stretch px-1 pt-1 pb-1.5", gridColsClass)}>
        {items.map((item) => {
          const isActive = activeHref
            ? isNavItemActive(item, activeHref)
            : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] leading-tight font-medium transition-colors duration-200 select-none active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-transparent group-hover:bg-muted/70",
                )}
              >
                <item.icon className="size-5" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu Explorar"
          aria-expanded={isMenuOpen}
          aria-current={isMenuActive && !isMenuOpen ? "page" : undefined}
          className={cn(
            "group flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] leading-tight font-medium transition-colors duration-200 select-none active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
            isMenuActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none",
              isMenuActive
                ? "bg-primary/10 text-primary"
                : "bg-transparent group-hover:bg-muted/70",
            )}
          >
            <CompassIcon className="size-5" />
          </span>
          <span>Explorar</span>
        </button>
      </div>
    </nav>
  );
}
