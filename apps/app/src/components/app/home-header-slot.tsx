"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { HomeHeaderTabs } from "@/components/home/home-header-tabs";
import { cn } from "@/lib/utils";

const HEADER_BASE_CLASS =
  "sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:gap-3 sm:px-6";

/** Rotas da Agenda que adotam modo full-frame sem barra superior dedicada. */
export function isCalendarRoute(pathname: string | null | undefined) {
  if (!pathname) return false;
  return (
    pathname === "/calendar" ||
    pathname === "/dashboard/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname.startsWith("/dashboard/calendar/")
  );
}

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
 * Header sticky do layout que reconhece a home integrada e o modo full-frame da
 * agenda (removendo a barra superior e mantendo apenas o ícone de notificação).
 */
export function HomeAwareHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isCalendar = isCalendarRoute(pathname);
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

  if (isCalendar) {
    return (
      <header className="pointer-events-none sticky top-0 z-20 flex h-0 items-start justify-between overflow-visible border-0 bg-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        {children}
      </header>
    );
  }

  return (
    <header className={getHeaderClassName(isHome, scrolled)}>
      {children}
    </header>
  );
}

/**
 * Fallback leve usado pelo Suspense durante o prerender. Não recebe filhos,
 * não consulta o pathname e não monta loaders: apenas esqueletos visuais que
 * ocupam o mesmo espaço do header real, evitando duplicar conteúdo (e locks)
 * no momento da hidratação.
 */
export function HomeAwareHeaderFallback() {
  return (
    <header className={getHeaderClassName(false, false)}>
      <div
        aria-hidden
        className="hidden size-8 animate-pulse rounded-md bg-muted md:block"
      />
      <div
        aria-hidden
        className="h-7 w-28 animate-pulse rounded-md bg-muted md:hidden"
      />
      <div aria-hidden className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="ml-auto flex items-center gap-2">
        <div
          aria-hidden
          className="size-8 animate-pulse rounded-full bg-muted"
        />
        <div
          aria-hidden
          className="size-8 animate-pulse rounded-full bg-muted"
        />
      </div>
    </header>
  );
}

/**
 * Oculta elementos extras do header global quando a agenda está em modo full-frame,
 * preservando apenas o acionador do menu lateral e o ícone de notificações.
 */
export function CalendarHiddenSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isCalendarRoute(pathname)) return null;
  return <>{children}</>;
}

/**
 * Na home, o centro do header abriga as abas Hoje / Minha Igreja. Nas demais
 * rotas, preserva o breadcrumb original recebido como slot.
 */
export function HeaderCenterSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isCalendarRoute(pathname)) {
    return null;
  }

  if (pathname === "/") {
    return <HomeHeaderTabs />;
  }

  return <>{children}</>;
}

/**
 * Na home, o avatar/menu do usuário também aparece no desktop. Na agenda
 * full-frame é ocultado para manter apenas o sino de notificação.
 */
export function HeaderUserSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isCalendarRoute(pathname)) {
    return null;
  }

  if (pathname === "/") {
    return <div className="flex items-center">{children}</div>;
  }

  return <div className="flex items-center md:hidden">{children}</div>;
}
