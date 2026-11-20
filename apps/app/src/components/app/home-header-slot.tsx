"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { HomeHeaderTabs } from "@/components/home/home-header-tabs";
import { cn } from "@/lib/utils";

const HEADER_BASE_CLASS =
  "sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:gap-3 sm:px-6";

/** Considera rolado a partir de 4px para evitar flicker com sub-pixel scroll. */
export function isHeaderScrolled(scrollY: number) {
  return scrollY > 4;
}

/**
 * Classes do header sticky. Na home o indicador de borda só aparece depois que
 * o usuário rola a página; nas demais rotas o header mantém a borda original.
 */
export function getHeaderClassName(isHome: boolean, scrolled: boolean) {
  return cn(
    HEADER_BASE_CLASS,
    isHome
      ? cn(
          "mt-2 transition-colors duration-200",
          scrolled ? "border-border" : "border-transparent",
        )
      : "border-border",
  );
}

/**
 * Header sticky do layout que reconhece a home integrada: aplica uma margem
 * superior e revela a borda inferior apenas quando a página é rolada.
 */
export function HomeAwareHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => {
      setScrolled(isHeaderScrolled(window.scrollY));
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrolled);
    };
  }, []);

  return (
    <header className={getHeaderClassName(isHome, scrolled)}>
      {children}
    </header>
  );
}

/**
 * Fallback usado pelo Suspense durante o prerender das rotas cujo pathname não
 * pode ser resolvido. Mantém o header original e os mesmos filhos.
 */
export function HomeAwareHeaderFallback({ children }: { children: ReactNode }) {
  return (
    <header className={getHeaderClassName(false, false)}>{children}</header>
  );
}

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
