"use client";

import { usePathname } from "next/navigation";

import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { useMobileMenu } from "@/components/app/mobile-menu";

export function MobileNav() {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();

  return (
    <MobileNavShell
      activeHref={pathname}
      onMenuClick={() => setOpen(true)}
      isMenuOpen={open}
    />
  );
}
