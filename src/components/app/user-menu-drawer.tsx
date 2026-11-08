"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { signOutAction } from "@/app/actions/auth";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getInitials, roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const themeOptions = [
  {
    value: "light",
    label: "Claro",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Escuro",
    icon: MoonIcon,
  },
  {
    value: "system",
    label: "Sistema",
    icon: MonitorIcon,
  },
] as const;

export type UserMenuDrawerProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  role: string;
  organizationName?: string;
};

export function UserMenuDrawer({
  user,
  role,
  organizationName,
}: UserMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const { openSettings } = useSettingsModal();
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  function handleOpenSettings() {
    setOpen(false);
    openSettings();
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="group relative flex size-8 sm:size-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 cursor-pointer shrink-0"
        >
          <Avatar className="size-8 sm:size-9 border border-border/70 shadow-2xs">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DrawerTrigger>

      <DrawerContent className="gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0 sm:max-w-md sm:mx-auto">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Menu do usuário</DrawerTitle>
          <DrawerDescription>
            Opções da sua conta, perfil, aparência e preferências.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-5 pt-4 pb-6">
          {/* User Profile Card (Clickable link to profile) */}
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="group flex w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-3.5 text-left shadow-2xs transition-all hover:bg-muted/50 hover:border-border active:scale-[0.99] cursor-pointer"
          >
            <Avatar className="size-12 shrink-0 border border-border/80 ring-1 ring-transparent group-hover:ring-primary/25 transition-all">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="bg-primary/10 font-heading text-base font-semibold text-primary">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-0.5 text-left">
              <p className="truncate font-heading text-base font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors text-left">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground text-left">
                {user.email}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-start gap-1.5 pt-0.5 text-left">
                <Badge
                  variant="secondary"
                  className="h-5 px-2 text-[10px] font-medium shrink-0"
                >
                  {roleLabel(role)}
                </Badge>
                {organizationName ? (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {organizationName}
                  </span>
                ) : null}
              </div>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>

          {/* Main Navigation Options */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
            <button
              type="button"
              onClick={handleOpenSettings}
              className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 cursor-pointer"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SettingsIcon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Configurações
                </p>
                <p className="text-xs text-muted-foreground">
                  Preferências da conta, igreja e segurança
                </p>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
            </button>

            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 border-t border-border/50 px-3.5 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BellIcon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Notificações
                </p>
                <p className="text-xs text-muted-foreground">
                  Central de avisos e notificações push
                </p>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
            </Link>
          </div>

          {/* Theme Selector Section */}
          <section className="space-y-2">
            <h3 className="px-1 text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
              Tema e Aparência
            </h3>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-card p-1.5 shadow-2xs">
              {themeOptions.map((opt) => {
                const isSelected = mounted && theme === opt.value;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-medium transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-95",
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      <Icon className="size-4.5" />
                      {isSelected ? (
                        <CheckIcon className="absolute -top-1 -right-2 size-2.5 stroke-[3]" />
                      ) : null}
                    </div>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sign Out Button */}
          <div className="pt-1">
            <form action={signOutAction} className="w-full">
              <input type="hidden" name="redirectTo" value="/" />
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15 cursor-pointer"
              >
                <LogOutIcon className="size-4" />
                <span>Sair da conta</span>
              </button>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
