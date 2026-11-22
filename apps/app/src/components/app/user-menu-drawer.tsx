"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowRightLeftIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  RocketIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { SignOutConfirmDialog } from "@/components/app/sign-out-confirm-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useDeviceSessions } from "@/hooks/use-device-sessions";
import { releaseNotesStore } from "@/lib/release-notes-store";
import { CURRENT_APP_VERSION } from "@/config/release-notes";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const { sessions: deviceSessions } = useDeviceSessions();
  const otherSessions = (deviceSessions ?? []).filter(
    (s) => s.user.email !== user.email,
  );

  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const handleSwitchSession = async (
    sessionToken: string,
    targetName: string,
  ) => {
    if (switching) return;
    setSwitching(true);
    toast.loading(`Alternando para ${targetName}...`, {
      id: "switch-account-mobile",
    });
    try {
      const res = await authClient.multiSession.setActive({ sessionToken });
      if (res?.error) {
        toast.error(res.error.message || "Erro ao alternar conta.", {
          id: "switch-account-mobile",
        });
        setSwitching(false);
        return;
      }
      toast.success(`Conectado como ${targetName}!`, {
        id: "switch-account-mobile",
      });
      setDrawerOpen(false);
      setDesktopMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao alternar conta.", {
        id: "switch-account-mobile",
      });
      setSwitching(false);
    }
  };

  const avatarTriggerClassName =
    "group relative flex size-8 sm:size-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 cursor-pointer shrink-0";

  const avatarTriggerContent = (
    <Avatar className="size-8 sm:size-9 border border-border/70 shadow-2xs">
      <AvatarImage src={user.image ?? undefined} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu open={desktopMenuOpen} onOpenChange={setDesktopMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu do usuário"
              className={avatarTriggerClassName}
            >
              {avatarTriggerContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-72 rounded-xl p-1.5"
            side="bottom"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-start gap-2.5 px-2 py-2 text-left">
                <Avatar className="size-9 shrink-0 rounded-full border border-border/70">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-0.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold leading-tight text-foreground">
                      {user.name}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full bg-emerald-500"
                      title="Conta ativa"
                    />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge
                      variant="secondary"
                      className="h-5 px-2 text-[11px] font-medium shrink-0"
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
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {otherSessions.length > 0 ? (
              <>
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  Alternar Conta ({otherSessions.length})
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {otherSessions.map((s) => (
                    <DropdownMenuItem
                      key={s.session.token}
                      disabled={switching}
                      onClick={() =>
                        handleSwitchSession(s.session.token, s.user.name)
                      }
                      className="cursor-pointer gap-2.5 py-2"
                    >
                      <Avatar className="size-6 shrink-0 rounded-full border border-border/70">
                        <AvatarImage
                          src={s.user.image ?? undefined}
                          alt={s.user.name}
                        />
                        <AvatarFallback className="text-[11px]">
                          {getInitials(s.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate text-xs font-medium">
                          {s.user.name}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {s.user.email}
                        </span>
                      </div>
                      <ArrowRightLeftIcon className="size-3.5 text-muted-foreground" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}

            <DropdownMenuItem asChild>
              <Link
                href="/login?redirect=/dashboard"
                onClick={() => setDesktopMenuOpen(false)}
                className="min-h-8 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              >
                <UserPlusIcon className="size-4" />
                Conectar outra conta
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  prefetch={true}
                  onClick={() => setDesktopMenuOpen(false)}
                  className="min-h-8 cursor-pointer"
                >
                  <UserIcon className="size-4" />
                  Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  prefetch={true}
                  onClick={() => setDesktopMenuOpen(false)}
                  className="min-h-8 cursor-pointer"
                >
                  <SettingsIcon className="size-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/notifications"
                  prefetch={true}
                  onClick={() => setDesktopMenuOpen(false)}
                  className="min-h-8 cursor-pointer"
                >
                  <BellIcon className="size-4" />
                  Notificações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setDesktopMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("open-onboarding-tour"));
                }}
                className="min-h-8 cursor-pointer"
              >
                <SparklesIcon className="size-4" />
                Tour da Plataforma
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setDesktopMenuOpen(false);
                  releaseNotesStore.open();
                }}
                className="min-h-8 cursor-pointer"
              >
                <RocketIcon className="size-4" />
                <span>O que há de novo</span>
                <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  v{CURRENT_APP_VERSION}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <div className="px-2 py-1.5">
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                Tema
              </p>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
                {themeOptions.map((opt) => {
                  const isSelected = mounted && theme === opt.value;
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex min-h-7 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                        isSelected
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

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setDesktopMenuOpen(false);
                setShowSignOutConfirm(true);
              }}
              className="min-h-8 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOutIcon className="size-4" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="md:hidden">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu do usuário"
              className={avatarTriggerClassName}
            >
              {avatarTriggerContent}
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
                onClick={() => setDrawerOpen(false)}
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
                      className="h-5 px-2 text-[11px] font-medium shrink-0"
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

              {/* Multi-Session: Contas conectadas neste dispositivo */}
              {otherSessions.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">
                      Alternar Conta ({otherSessions.length})
                    </h3>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs divide-y divide-border/40">
                    {otherSessions.map((s) => (
                      <button
                        key={s.session.token}
                        type="button"
                        disabled={switching}
                        onClick={() =>
                          handleSwitchSession(s.session.token, s.user.name)
                        }
                        className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 cursor-pointer"
                      >
                        <Avatar className="size-9 shrink-0 border border-border/80">
                          <AvatarImage
                            src={s.user.image ?? undefined}
                            alt={s.user.name}
                          />
                          <AvatarFallback className="bg-muted text-xs font-semibold">
                            {getInitials(s.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-0.5 text-left">
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.user.email}
                          </p>
                        </div>
                        <ArrowRightLeftIcon className="size-4 text-muted-foreground/60 shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Adicionar outra conta */}
              <Link
                href="/login?redirect=/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
              >
                <UserPlusIcon className="size-4" />
                <span>Conectar outra conta</span>
              </Link>

              {/* Main Navigation Options */}
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
                <Link
                  href="/dashboard/settings"
                  prefetch={true}
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
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
                </Link>

                <Link
                  href="/dashboard/notifications"
                  prefetch={true}
                  onClick={() => setDrawerOpen(false)}
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

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    window.dispatchEvent(new CustomEvent("open-onboarding-tour"));
                  }}
                  className="flex min-h-12 w-full items-center gap-3 border-t border-border/50 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 cursor-pointer"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <SparklesIcon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      Tour da Plataforma
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rever introdução e recursos do OpenMinistry
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    releaseNotesStore.open();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 border-t border-border/50 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 cursor-pointer"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <RocketIcon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">
                        Novidades da Versão
                      </p>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        v{CURRENT_APP_VERSION}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recursos novos e atualizações do sistema
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
                </button>
              </div>

              {/* Theme Selector Section */}
              <section className="space-y-2">
                <h3 className="px-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">
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
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setTimeout(() => setShowSignOutConfirm(true), 150);
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15 cursor-pointer"
                >
                  <LogOutIcon className="size-4" />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
      />
    </>
  );
}
