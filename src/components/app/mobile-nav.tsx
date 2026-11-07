"use client";

import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";
import { MobileNavShell } from "@/components/app/mobile-nav-shell";

export function MobileNav() {
  const pathname = usePathname();
  const { toggleSidebar, openMobile } = useSidebar();

  return (
    <MobileNavShell
      activeHref={pathname}
      onMenuClick={toggleSidebar}
      isMenuOpen={openMobile}
    />
  );
}
