"use client";

import { usePathname } from "next/navigation";

import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { useMobileMenu } from "@/components/app/mobile-menu";
import type { NavItem } from "@/components/app/nav-config";

export function MobileNav({ items }: { items?: NavItem[] }) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();

  return (
    <MobileNavShell
      activeHref={pathname}
      onMenuClick={() => setOpen(true)}
      isMenuOpen={open}
      items={items}
    />
  );
}
