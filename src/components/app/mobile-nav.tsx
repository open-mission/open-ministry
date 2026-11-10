"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { useMobileMenu } from "@/components/app/mobile-menu";
import type { NavItem } from "@/components/app/nav-config";
import { buildAccessibleMobileNavItems } from "@/lib/modules/nav";
import type { ModuleKey } from "@/lib/modules/types";

export function MobileNav({
  items: customItems,
  activeModuleKeys,
}: {
  items?: NavItem[];
  activeModuleKeys?: ModuleKey[];
}) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();

  const items = useMemo(() => {
    if (customItems) return customItems;
    if (activeModuleKeys) return buildAccessibleMobileNavItems(activeModuleKeys);
    return undefined;
  }, [customItems, activeModuleKeys]);

  return (
    <MobileNavShell
      activeHref={pathname}
      onMenuClick={() => setOpen(true)}
      isMenuOpen={open}
      items={items}
    />
  );
}
