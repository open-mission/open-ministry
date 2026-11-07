"use client";

import { usePathname } from "next/navigation";

import { MobileNavShell } from "@/components/app/mobile-nav-shell";

export function MobileNav() {
  const pathname = usePathname();

  return <MobileNavShell activeHref={pathname} />;
}
