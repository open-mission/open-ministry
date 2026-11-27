"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resolveHeaderScaffoldLevel,
  type HeaderScaffoldLevel,
} from "./header-scaffold-config";
import { getParentHref } from "./nav-config";

type PageHeaderScaffoldProps = {
  title: string;
  desktopTitle?: string;
  subtitle?: string;
  badge?: ReactNode;
  backHref?: string;
  backLabel?: string;
  level?: HeaderScaffoldLevel;
  mobileAction?: ReactNode;
  desktopActions?: ReactNode;
  showMobileDivider?: boolean;
  className?: string;
};

/**
 * Cabeçalho dinâmico no padrão Scaffold (Mobile estilo iOS + Desktop com Sidebar).
 * Adapta botão de voltar, tipografia e espaço para ações globais conforme o nível
 * da rota (`root-tab`, `explore`, `detail`).
 */
export function PageHeaderScaffold({
  title,
  desktopTitle,
  subtitle,
  badge,
  backHref,
  backLabel = "Voltar",
  level: levelOverride,
  mobileAction,
  desktopActions,
  showMobileDivider = true,
  className,
}: PageHeaderScaffoldProps) {
  const pathname = usePathname() ?? "/";
  const level = levelOverride ?? resolveHeaderScaffoldLevel(pathname);
  const resolvedBackHref = backHref ?? getParentHref(pathname);
  const showMobileBack = level === "explore" || level === "detail";
  const reserveGlobalChromeSpace = level !== "detail";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {showMobileBack ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={backLabel}
              title={backLabel}
              className="-ml-2 size-11 shrink-0"
            >
              <Link href={resolvedBackHref}>
                <ArrowLeftIcon className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}

          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "truncate tracking-tight text-foreground",
                level === "root-tab"
                  ? "font-heading text-xl leading-6 font-semibold"
                  : "text-base leading-5 font-semibold",
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {mobileAction || reserveGlobalChromeSpace ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1",
              reserveGlobalChromeSpace && "pr-18 sm:pr-20.5",
            )}
          >
            {mobileAction}
          </div>
        ) : null}
      </header>

      {showMobileDivider ? (
        <div aria-hidden="true" className="h-px shrink-0 bg-border/70 md:hidden" />
      ) : null}

      <header className="hidden md:flex md:items-end md:justify-between md:gap-4">
        <div className="min-w-0 space-y-1">
          {level === "detail" ? (
            <Link
              href={resolvedBackHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1
              className={cn(
                "line-clamp-2 font-heading font-semibold tracking-tight text-foreground",
                level === "detail"
                  ? "text-2xl sm:text-3xl"
                  : "text-3xl sm:text-4xl",
              )}
            >
              {desktopTitle ?? title}
            </h1>
            {badge}
          </div>
        </div>

        {desktopActions ? (
          <div className="flex shrink-0 items-center gap-2">
            {desktopActions}
          </div>
        ) : null}
      </header>
    </div>
  );
}
