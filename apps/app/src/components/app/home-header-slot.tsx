"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { HomeHeaderTabs } from "@/components/home/home-header-tabs";

/**
 * Na home, o centro do header abriga as abas Hoje / Minha Igreja. Nas demais
 * rotas, preserva o breadcrumb original recebido como slot.
 */
export function HeaderCenterSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <HomeHeaderTabs />;
  }

  return <>{children}</>;
}

/**
 * Na home, o avatar/menu do usuário também aparece no desktop. Nas demais
 * rotas, continua visível apenas em telas pequenas (o desktop usa outro menu).
 */
export function HeaderUserSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <div className="flex items-center">{children}</div>;
  }

  return <div className="flex items-center md:hidden">{children}</div>;
}
