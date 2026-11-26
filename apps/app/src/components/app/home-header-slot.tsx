"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const HEADER_BASE_CLASS =
  "sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-0 bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:gap-3 sm:px-6";

/** Rotas da Agenda que ocultam a barra superior mantendo apenas notificações. */
export function isCalendarRoute(pathname: string | null | undefined) {
  if (!pathname) return false;
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

/** Considera rolado a partir de 4px para evitar flicker com sub-pixel scroll. */
export function isHeaderScrolled(scrollY: number) {
  return scrollY > 4;
}

/**
 * Classes do header sticky. Na home o indicador de borda só aparece depois que
 * o usuário rola a página; nas demais rotas o header mantém a borda original.
 */
export function getHeaderClassName(isHome: boolean, _scrolled: boolean) {
  return cn(
    HEADER_BASE_CLASS,
    isHome
      ? "py-2 border-0 transition-colors duration-200 lg:mt-2 lg:py-0"
      : "border-0 lg:h-11 lg:min-h-0 lg:pt-1.5 lg:px-8",
  );
}

/**
 * Header sticky do layout que reconhece a home integrada: aplica uma margem
 * superior e revela a borda inferior apenas quando a página é rolada.
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
      <header
        data-calendar-active=""
        className="pointer-events-none sticky top-0 z-20 -mb-[calc(3.5rem+env(safe-area-inset-top))] flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between overflow-visible border-0 bg-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 md:mb-0 md:h-11 md:pt-1.5 lg:px-8"
      >
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
        className="hidden size-8 animate-pulse rounded-md bg-muted lg:block"
      />
      <div
        aria-hidden
        className="h-7 w-28 animate-pulse rounded-md bg-muted lg:hidden"
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
 * Oculta elementos extras do header global na rota da agenda para ganhar espaço,
 * preservando apenas o ícone de notificações e o menu do usuário (o alternador da
 * barra lateral passa a ficar ao lado do título do período).
 */
export function CalendarHiddenSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isCalendarRoute(pathname)) return null;
  return <>{children}</>;
}

/**
 * Na home o centro do header fica vazio: as abas "Hoje | Minha Igreja" foram
 * substituídas pelas visões dedicadas (mobile/tablet e desktop), e o sino e o
 * avatar seguem nos slots da direita. Nas demais rotas o desktop mantém o
 * header minimalista (sem breadcrumb), preservando o breadcrumb apenas em
 * subpáginas mobile e tablet (< 1024px).
 */
export function HeaderCenterSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isCalendarRoute(pathname) || pathname === "/") {
    return null;
  }

  return <div className="lg:hidden">{children}</div>;
}

/**
 * Exibe o avatar e menu do usuário no header em todas as páginas (desktop e mobile).
 */
export function HeaderUserSlot({ children }: { children: ReactNode }) {
  return <div className="flex items-center">{children}</div>;
}
