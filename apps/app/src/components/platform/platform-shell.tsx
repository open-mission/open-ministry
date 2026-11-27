"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  Building2Icon,
  LayersIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  MoonIcon,
  PlugIcon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const PLATFORM_NAV_ITEMS = [
  {
    href: "/platform",
    label: "Organizações",
    shortLabel: "Organizações",
    icon: LayoutDashboardIcon,
    match: (pathname: string) => pathname === "/platform",
  },
  {
    href: "/platform/integrations",
    label: "Integrações",
    shortLabel: "Integrações",
    icon: PlugIcon,
    match: (pathname: string) => pathname.startsWith("/platform/integrations"),
  },
  {
    href: "/platform/plans",
    label: "Planos",
    shortLabel: "Planos",
    icon: LayersIcon,
    match: (pathname: string) => pathname.startsWith("/platform/plans"),
  },
  {
    href: "/platform/operators",
    label: "Operadores & Auditoria",
    shortLabel: "Operadores",
    icon: ShieldCheckIcon,
    match: (pathname: string) => pathname.startsWith("/platform/operators"),
  },
] as const;

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: MonitorIcon },
] as const;

export type PlatformEvolutionHealthSummary = {
  isEnabled: boolean;
  source?: "env" | "platform" | "unconfigured";
  lastHealthStatus: string | null;
  lastHealthLatencyMs: number | null;
} | null;

type PlatformShellProps = {
  operator: {
    name?: string | null;
    email?: string | null;
  };
  evolutionHealth: PlatformEvolutionHealthSummary;
  children?: ReactNode;
};

function EvolutionHealthPill({
  health,
}: {
  health: PlatformEvolutionHealthSummary;
}) {
  const isHealthy =
    health?.isEnabled && health.lastHealthStatus === "healthy";
  const isDegraded =
    health?.isEnabled &&
    health.lastHealthStatus !== null &&
    health.lastHealthStatus !== "healthy";
  const isUnconfigured = !health || health.source === "unconfigured";

  const label = isUnconfigured
    ? "Evolution Go · Não configurada"
    : !health.isEnabled
      ? "Evolution Go · Pausada"
      : isHealthy
        ? `Evolution Go · Online${health.lastHealthLatencyMs != null ? ` (${health.lastHealthLatencyMs}ms)` : ""}`
        : isDegraded
          ? "Evolution Go · Atenção"
          : health.source === "env"
            ? "Evolution Go · Via .env"
            : "Evolution Go · Aguardando teste";

  return (
    <Link
      href="/platform/integrations"
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/60",
        isHealthy
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : isDegraded
            ? "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            : "border-border bg-card text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          isHealthy
            ? "bg-emerald-500"
            : isDegraded
              ? "bg-amber-500"
              : "bg-muted-foreground/50",
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function PlatformShell({
  operator,
  evolutionHealth,
  children,
}: PlatformShellProps) {
  const pathname = usePathname() || "/platform";
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const operatorName = operator.name?.trim() || "Super Admin";
  const operatorEmail = operator.email?.trim() || "operador@plataforma";

  const cycleMobileTheme = () => {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const ActiveMobileThemeIcon =
    mounted && theme === "dark"
      ? MoonIcon
      : mounted && theme === "light"
        ? SunIcon
        : MonitorIcon;

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-sidebar">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheckIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Super Admin
            </p>
            <p className="truncate font-heading text-sm font-semibold leading-tight text-sidebar-foreground">
              OpenMinistry
            </p>
          </div>
        </div>

        <nav
          aria-label="Navegação da plataforma"
          className="flex-1 space-y-1 p-3"
        >
          {PLATFORM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-3">
          {/* Theme switch */}
          <div className="rounded-lg bg-muted/50 p-1">
            <div className="grid grid-cols-3 gap-1">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = mounted && theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-label={`Tema ${opt.label}`}
                    className={cn(
                      "flex min-h-8 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                      selected
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator identity */}
          <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(operatorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {operatorName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {operatorEmail}
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Voltar ao app da igreja</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop Top Bar */}
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Plataforma</span>
            <span>·</span>
            <span>Operação Global</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge
              variant="outline"
              className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground"
            >
              <Building2Icon className="size-3.5" />
              Sem igreja ativa
            </Badge>
            <EvolutionHealthPill health={evolutionHealth} />
          </div>
        </header>

        {/* Mobile Sticky Header (replaces church MobileNavShell) */}
        <header className="sticky top-0 z-20 space-y-2.5 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheckIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Super Admin
                </p>
                <p className="truncate font-heading text-sm font-semibold leading-tight">
                  OpenMinistry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cycleMobileTheme}
                aria-label="Alternar tema"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <ActiveMobileThemeIcon className="size-4" />
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeftIcon className="size-3.5" />
                <span>App da igreja</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="min-h-7 gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground"
            >
              <Building2Icon className="size-3" />
              Sem igreja ativa
            </Badge>
            <EvolutionHealthPill health={evolutionHealth} />
          </div>

          <nav
            aria-label="Navegação móvel da plataforma"
            className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 no-scrollbar"
          >
            {PLATFORM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
