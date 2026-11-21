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
import { ChevronRightIcon, MenuIcon, SettingsIcon } from "lucide-react";

import { useOptionalSettingsModal } from "@/components/settings/settings-modal-context";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { isNavItemActive, type NavGroup } from "@/components/app/nav-config";
import { buildAccessibleMobileMenuGroups } from "@/lib/modules/nav";
import type { ModuleKey } from "@/lib/modules/types";
import { cn } from "@/lib/utils";

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

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
      <MenuIcon />
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
}: {
  groups?: NavGroup[];
  organizationName?: string;
  activeModuleKeys?: ModuleKey[];
  canManageJobs?: boolean;
  canAccessWhatsApp?: boolean;
  canAccessEmails?: boolean;
} = {}) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();
  const settingsModal = useOptionalSettingsModal();
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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="gap-0 border-x-0 border-b-0 p-0">
        <DrawerHeader className="border-b border-border/60 px-4 pt-3 pb-3 !text-left">
          <DrawerTitle className="font-heading text-lg">Navegação</DrawerTitle>
          <DrawerDescription className="text-xs">
            {organizationName ?? "Acesse as áreas e módulos do painel."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto overscroll-contain px-4 pt-3 pb-6 [-webkit-overflow-scrolling:touch]">
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
                          onClick={() => setOpen(false)}
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
