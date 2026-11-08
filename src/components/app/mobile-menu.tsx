"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { isNavItemActive, navGroups } from "@/components/app/nav-config";
import { cn } from "@/lib/utils";

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ open, setOpen }}>
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
      size="icon-sm"
      aria-label="Abrir menu de navegação"
      className={cn("md:hidden", className)}
      onClick={() => setOpen(true)}
    >
      <MenuIcon />
    </Button>
  );
}

export function MobileMenu() {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isDark = mounted && resolvedTheme === "dark";
  const themeValue = isDark ? "Escuro" : "Claro";
  const themeAction = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="h-[90dvh] gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Menu de navegação</DrawerTitle>
          <DrawerDescription>
            Acesse as áreas do painel, seu perfil e as preferências da conta.
          </DrawerDescription>
        </DrawerHeader>

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto overscroll-contain px-4 pt-3 pb-6">
            <nav aria-label="Menu principal" className="space-y-5">
              {navGroups.map((group) => (
                <section key={group.title} className="space-y-2">
                  <h2 className="px-1 text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
                    {group.title}
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                    {group.items.map((item, index) => {
                      const isActive = isNavItemActive(item, pathname);
  
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
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
                              "flex-1 text-sm",
                              isActive
                                ? "font-semibold text-primary"
                                : "font-medium text-foreground",
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
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-background to-transparent"
          />
        </div>

        <div className="border-t border-border/60 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={themeAction}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60 active:bg-muted"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {isDark ? (
                <SunIcon className="size-4" />
              ) : (
                <MoonIcon className="size-4" />
              )}
            </span>
            <span className="flex-1 text-left">Tema</span>
            <span className="text-xs text-muted-foreground">{themeValue}</span>
          </button>

          <form action={signOutAction}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/10">
                <LogOutIcon className="size-4" />
              </span>
              <span className="flex-1 text-left">Sair da conta</span>
            </button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
