"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  CheckSquare2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  CompassIcon,
  HandHeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  Music2Icon,
  Music4Icon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { useOptionalSettingsModal } from "@/components/settings/settings-modal-context";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import {
  toSerializableExploreDomains,
  type MobileExploreDomainData,
} from "@/components/app/domain-subtabs-data";
import {
  buildAccessibleMobileMenuGroups,
  buildDesktopSidebarNavigation,
  buildMobileExploreQuickLinks,
  filterMobileExploreRoutes,
} from "@/lib/modules/nav";
import type { ModuleKey } from "@/lib/modules/types";
import { cn } from "@/lib/utils";

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

const exploreIcons: Record<string, LucideIcon> = {
  "/": LayoutDashboardIcon,
  cultos: CalendarDaysIcon,
  louvor: Music2Icon,
  pessoas: UsersIcon,
  comunicacao: MegaphoneIcon,
  "/bible": BookOpenIcon,
  "/tasks": CheckSquare2Icon,
  "/jobs": LayersIcon,
  "/calendar": CalendarRangeIcon,
  "/events": CalendarDaysIcon,
  "/schedules": ClipboardListIcon,
  "/availability": CalendarCheckIcon,
  "/songs": Music2Icon,
  "/rehearsals": Music4Icon,
  "/members": UsersIcon,
  "/departments": HandHeartIcon,
  "/birthdays": CakeIcon,
  "/announcements": MegaphoneIcon,
  "/whatsapp": MessageSquareIcon,
  "/emails": MailIcon,
};

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);

  if (!context) {
    throw new Error("useMobileMenu must be used inside MobileMenuProvider");
  }

  return context;
}

export function MobileMenuTrigger({ className }: { className?: string }) {
  const { setOpen } = useMobileMenu();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Abrir menu de navegação"
      className={cn("size-11 md:hidden", className)}
      onClick={() => setOpen(true)}
    >
      <CompassIcon />
    </Button>
  );
}

export function MobileMenu({
  groups: customGroups,
  organizationName,
  activeModuleKeys = [],
  canManageJobs,
  canAccessWhatsApp,
  canAccessEmails,
  exploreDomains,
  exploreSecondary,
}: {
  groups?: NavGroup[];
  organizationName?: string;
  activeModuleKeys?: ModuleKey[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
  exploreDomains?: MobileExploreDomainData[];
  exploreSecondary?: MobileExploreDomainData[];
} = {}) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();
  const settingsModal = useOptionalSettingsModal();
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () =>
      customGroups ??
      buildAccessibleMobileMenuGroups(activeModuleKeys, {
        canManageJobs,
        canAccessWhatsApp,
        canAccessEmails,
      }),
    [
      customGroups,
      activeModuleKeys,
      canManageJobs,
      canAccessWhatsApp,
      canAccessEmails,
    ],
  );

  const options = useMemo(
    () => ({ canManageJobs, canAccessWhatsApp, canAccessEmails }),
    [canManageJobs, canAccessWhatsApp, canAccessEmails],
  );

  const fallbackNavigation = useMemo(
    () =>
      exploreDomains !== undefined && exploreSecondary !== undefined
        ? null
        : buildDesktopSidebarNavigation(activeModuleKeys, options),
    [exploreDomains, exploreSecondary, activeModuleKeys, options],
  );

  const resolvedExploreDomains = useMemo(
    () =>
      exploreDomains ??
      toSerializableExploreDomains(fallbackNavigation?.primary ?? []),
    [exploreDomains, fallbackNavigation],
  );

  const resolvedExploreSecondary = useMemo(
    () =>
      exploreSecondary ??
      toSerializableExploreDomains(fallbackNavigation?.secondary ?? []),
    [exploreSecondary, fallbackNavigation],
  );

  const quickLinks = useMemo(
    () => buildMobileExploreQuickLinks(activeModuleKeys, options),
    [activeModuleKeys, options],
  );

  const searchTerm = query.trim();
  const searchResults = useMemo(
    () =>
      searchTerm
        ? filterMobileExploreRoutes(searchTerm, activeModuleKeys, options)
        : [],
    [searchTerm, activeModuleKeys, options],
  );

  const isCustomGroups = customGroups !== undefined;
  const closeMenu = () => setOpen(false);

  const isDomainActive = (domain: MobileExploreDomainData) =>
    isNavItemActive(domain, pathname) ||
    domain.tabs.some((tab) => isNavItemActive(tab, pathname));

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="gap-0 border-x-0 border-b-0 p-0">
        <DrawerHeader className="border-b border-border/60 px-4 pt-3 pb-3 !text-left">
          <DrawerTitle className="font-heading text-lg">Explorar</DrawerTitle>
          <DrawerDescription className="text-xs">
            {organizationName ?? "Acesse as áreas do painel."}
          </DrawerDescription>

          {isCustomGroups ? null : (
            <div className="relative mt-3">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar áreas e páginas"
                placeholder="Buscar áreas e páginas"
                className="h-11 pr-11 pl-10 text-base md:text-sm"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                  className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 active:bg-muted"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>
          )}
        </DrawerHeader>

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto overscroll-contain px-4 pt-3 pb-6 [-webkit-overflow-scrolling:touch]">
            {isCustomGroups ? (
              <nav aria-label="Menu principal" className="space-y-4">
                {groups.map((group) => (
                  <section key={group.title} className="space-y-2">
                    <h2 className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">
                      {group.title}
                    </h2>
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                      {group.items.map((item, index) => {
                        const isActive = isNavItemActive(item, pathname);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            onClick={closeMenu}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-muted/60",
                              index > 0 && "border-t border-border/50",
                              isActive && "bg-primary/[0.06]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <item.icon className="size-[18px]" />
                            </span>
                            <span
                              className={cn(
                                "flex-1 text-sm font-medium",
                                isActive ? "text-primary" : "text-foreground",
                              )}
                            >
                              {item.label}
                            </span>
                            <ChevronRightIcon
                              className={cn(
                                "size-4 shrink-0",
                                isActive
                                  ? "text-primary/50"
                                  : "text-muted-foreground/35",
                              )}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </nav>
            ) : searchTerm ? (
              <section aria-label="Resultados da busca" className="space-y-2">
                <h2 className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">
                  Resultados
                </h2>
                {searchResults.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                    {searchResults.map((route, index) => {
                      const Icon = exploreIcons[route.href] ?? SearchIcon;
                      const isActive = isNavItemActive(route, pathname);

                      return (
                        <Link
                          key={route.href}
                          href={route.href}
                          prefetch={true}
                          onClick={closeMenu}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-muted/60",
                            index > 0 && "border-t border-border/50",
                            isActive && "bg-primary/[0.06]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-[18px]" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span
                              className={cn(
                                "truncate text-sm font-medium",
                                isActive ? "text-primary" : "text-foreground",
                              )}
                            >
                              {route.label}
                            </span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {route.domainLabel}
                            </span>
                          </span>
                          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/35" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium">
                      Nenhum resultado encontrado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tente outro nome de área ou página.
                    </p>
                  </div>
                )}
              </section>
            ) : (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">
                    Atalhos rápidos
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {quickLinks.map((link) => {
                      const isActive = isNavItemActive(link, pathname);

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          prefetch={true}
                          onClick={closeMenu}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/70 bg-card text-foreground hover:bg-muted/60 active:bg-muted",
                          )}
                        >
                          {isActive ? (
                            <span
                              aria-hidden
                              className="size-1.5 rounded-full bg-primary"
                            />
                          ) : null}
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">
                    Áreas da igreja
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {resolvedExploreDomains.map((domain) => {
                      const Icon = exploreIcons[domain.key] ?? CompassIcon;
                      const isActive = isDomainActive(domain);

                      return (
                        <Link
                          key={domain.key}
                          href={domain.href}
                          prefetch={true}
                          onClick={closeMenu}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-28 flex-col gap-2 rounded-2xl border p-3 text-left transition-colors",
                            isActive
                              ? "border-primary/40 bg-primary/[0.06]"
                              : "border-border/70 bg-card hover:bg-muted/40 active:bg-muted",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "flex size-9 items-center justify-center rounded-xl",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="size-[18px]" />
                            </span>
                            {domain.badge ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {domain.badge}
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "text-sm leading-tight font-medium",
                              isActive ? "text-primary" : "text-foreground",
                            )}
                          >
                            {domain.label}
                          </span>
                          <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                            {domain.tabs.length > 0
                              ? domain.tabs.map((tab) => tab.label).join(" · ")
                              : "Acesso direto"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                {resolvedExploreSecondary.length > 0 ? (
                  <div className="space-y-1 border-t border-border/60 pt-4">
                    {resolvedExploreSecondary.map((item) => {
                      const Icon = exploreIcons[item.key] ?? CompassIcon;
                      const isActive = isNavItemActive(item, pathname);

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          prefetch={true}
                          onClick={closeMenu}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/[0.06] text-primary"
                              : "text-foreground hover:bg-muted/60 active:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {item.badge}
                            </span>
                          ) : null}
                          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/35" />
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-popover to-transparent"
          />
        </div>

        {settingsModal ? (
          <div className="border-t border-border/60 bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTimeout(() => settingsModal.openSettings(), 180);
              }}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 active:bg-muted"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <SettingsIcon className="size-4" />
              </span>
              <span className="flex-1 text-left">Configurações</span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
            </button>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
