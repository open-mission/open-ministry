"use client";

import {
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  BellIcon,
  Building2Icon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  LaptopIcon,
  LayersIcon,
  MessageSquareIcon,
  MessageSquareQuoteIcon,
  MoonIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  SunIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

import type { OrganizationPermissionSettingsData } from "@/app/actions/permissions";
import type {
  EvolutionSettingsView,
  PasskeyViewItem,
  SessionItem,
} from "@/app/actions/settings";
import { AboutCard } from "@/components/settings/about-card";
import { AccountProfileCard } from "@/components/settings/account-profile-card";
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card";
import { AdminEvolutionApiCard } from "@/components/settings/admin-evolution-api-card";
import { CalendarPreferencesCard } from "@/components/settings/calendar-preferences-card";
import { CalendarSyncCard } from "@/components/settings/calendar-sync-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { ChurchInfoCard } from "@/components/settings/church-info-card";
import { ChurchNomenclatureCard } from "@/components/settings/church-nomenclature-card";
import { MessageTemplatesCard } from "@/components/settings/message-templates-card";
import { ModulePermissionsCard } from "@/components/settings/module-permissions-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { OfflineCacheCard } from "@/components/settings/offline-cache-card";
import { PasskeysCard } from "@/components/settings/passkeys-card";
import { PwaInstallCard } from "@/components/settings/pwa-install-card";
import { ThemePreferenceCard } from "@/components/settings/theme-preference-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalendarPreferences } from "@/lib/calendar";
import type { CalendarFeedView } from "@/lib/calendar-feed-data";
import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { getInitials, roleLabel } from "@/lib/format";
import type { ResolvedTemplate } from "@/lib/message-templates";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export type SettingsScope = "account" | "church";

export type AccountTabId =
  | "profile"
  | "calendar"
  | "notifications"
  | "theme"
  | "security"
  | "app";

export type ChurchTabId = "church" | "whatsapp" | "templates" | "permissions";

export type MobileSettingsSection =
  | "account"
  | "theme"
  | "notifications"
  | "calendar"
  | "pwa_offline"
  | "security"
  | "about"
  | "church"
  | "whatsapp"
  | "templates"
  | "nomenclature"
  | "permissions";

export type SettingsViewProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
    metadata?: string | null;
  };
  role: string;
  isAdmin: boolean;
  userData: {
    name: string;
    username: string | null;
    email: string;
    birthday: string | null;
    phone: string | null;
    image: string | null;
  };
  calendarPreferences: CalendarPreferences;
  calendarFeeds: CalendarFeedView[];
  initialSessions: SessionItem[];
  initialPasskeys: PasskeyViewItem[];
  peopleCount: number;
  departmentsCount: number;
  evolutionSettings: EvolutionSettingsView | null;
  messageTemplates: ResolvedTemplate[];
  permissionSettings?: OrganizationPermissionSettingsData | null;
  initialScope?: SettingsScope;
  initialTab?: string;
  isModal?: boolean;
};

type DesktopTabItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

type MobileRowItem = {
  id: MobileSettingsSection;
  label: string;
  status?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon: LucideIcon;
};

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function formatThemeLabel(theme: string | undefined): string {
  if (theme === "dark") return "Escuro";
  if (theme === "light") return "Claro";
  return "Sistema";
}

function handleTablistArrowKey<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  items: readonly T[],
  current: T,
  onSelect: (next: T) => void,
) {
  const index = items.indexOf(current);
  if (index === -1) return;

  let nextIndex: number | null = null;
  if (event.key === "ArrowRight") {
    nextIndex = (index + 1) % items.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (index - 1 + items.length) % items.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = items.length - 1;
  }

  if (nextIndex !== null) {
    event.preventDefault();
    const nextId = items[nextIndex];
    onSelect(nextId);
    const siblings =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    siblings?.[nextIndex]?.focus();
  }
}

export function SettingsView({
  organization,
  role,
  isAdmin,
  userData,
  calendarPreferences,
  calendarFeeds,
  initialSessions,
  initialPasskeys,
  peopleCount,
  departmentsCount,
  evolutionSettings,
  messageTemplates,
  permissionSettings,
  initialScope,
  initialTab,
  isModal = false,
}: SettingsViewProps) {
  const churchMeta = parseChurchMetadata(organization.metadata);
  const currentTerminology = getDepartmentTerminology(churchMeta);
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const currentThemeLabel = mounted ? formatThemeLabel(theme) : "Sistema";

  const resolvedInitialScope: SettingsScope =
    initialScope === "church" ||
    (initialTab &&
      ["church", "whatsapp", "templates", "permissions", "nomenclature"].includes(
        initialTab,
      ))
      ? "church"
      : "account";

  const resolvedInitialAccountTab: AccountTabId =
    initialTab === "calendar" ||
    initialTab === "notifications" ||
    initialTab === "theme" ||
    initialTab === "security" ||
    initialTab === "app"
      ? initialTab
      : "profile";

  const resolvedInitialChurchTab: ChurchTabId =
    isAdmin &&
    (initialTab === "whatsapp" ||
      initialTab === "templates" ||
      initialTab === "permissions")
      ? initialTab
      : "church";

  const [scope, setScope] = useState<SettingsScope>(resolvedInitialScope);
  const [accountTab, setAccountTab] = useState<AccountTabId>(
    resolvedInitialAccountTab,
  );
  const [churchTab, setChurchTab] = useState<ChurchTabId>(
    resolvedInitialChurchTab,
  );
  const [activeMobileSection, setActiveMobileSection] =
    useState<MobileSettingsSection | null>(null);

  const isWhatsappConnected = Boolean(evolutionSettings?.isActive);
  const feedsBadge =
    calendarFeeds.length > 0 ? `${calendarFeeds.length}` : undefined;
  const passkeysBadge =
    initialPasskeys.length > 0 ? `${initialPasskeys.length}` : undefined;

  const accountTabs: DesktopTabItem<AccountTabId>[] = [
    { id: "profile", label: "Perfil", icon: UserIcon },
    {
      id: "calendar",
      label: "Agenda",
      icon: CalendarIcon,
      badge: feedsBadge,
    },
    { id: "notifications", label: "Notificações", icon: BellIcon },
    {
      id: "theme",
      label: "Aparência",
      icon: PaletteIcon,
    },
    {
      id: "security",
      label: "Segurança",
      icon: ShieldCheckIcon,
      badge: passkeysBadge,
    },
    {
      id: "app",
      label: "App & Sistema",
      icon: SmartphoneIcon,
    },
  ];

  const churchTabs: DesktopTabItem<ChurchTabId>[] = isAdmin
    ? [
        { id: "church", label: "Dados da Igreja", icon: Building2Icon },
        {
          id: "whatsapp",
          label: "WhatsApp",
          icon: MessageSquareIcon,
          badge: isWhatsappConnected ? "Conectado" : "Desconectado",
        },
        {
          id: "templates",
          label: "Modelos",
          icon: MessageSquareQuoteIcon,
          badge: `${messageTemplates.length}`,
        },
        {
          id: "permissions",
          label: "Equipes & Permissões",
          icon: SlidersHorizontalIcon,
        },
      ]
    : [{ id: "church", label: "Dados da Igreja", icon: Building2Icon }];

  const mobilePreferenceRows: MobileRowItem[] = [
    {
      id: "calendar",
      label: "Agenda & Calendário",
      status:
        calendarFeeds.length > 0
          ? `${calendarFeeds.length} ${calendarFeeds.length === 1 ? "link ativo" : "links ativos"}`
          : "Sincronizar",
      icon: CalendarIcon,
    },
    {
      id: "notifications",
      label: "Notificações",
      status: "Escalas e ensaios",
      icon: BellIcon,
    },
    {
      id: "theme",
      label: "Aparência",
      status: currentThemeLabel,
      icon: PaletteIcon,
    },
    {
      id: "pwa_offline",
      label: "Celular & Offline",
      status: "PWA e cache",
      icon: SmartphoneIcon,
    },
  ];

  const mobileSecurityRows: MobileRowItem[] = [
    {
      id: "security",
      label: "Segurança & Passkeys",
      status:
        initialPasskeys.length > 0
          ? `${initialPasskeys.length} ${initialPasskeys.length === 1 ? "ativa" : "ativas"}`
          : "Senha e sessões",
      icon: ShieldCheckIcon,
    },
    {
      id: "about",
      label: "Sobre o OpenMinistry",
      status: `v${APP_VERSION}`,
      icon: InfoIcon,
    },
  ];

  const mobileChurchRows: MobileRowItem[] = [
    {
      id: "church",
      label: "Dados da Igreja",
      status: `${peopleCount} membros · ${departmentsCount} ${currentTerminology.plural.toLowerCase()}`,
      icon: Building2Icon,
    },
    ...(isAdmin
      ? [
          {
            id: "whatsapp" as const,
            label: "WhatsApp (Evolution API)",
            badge: isWhatsappConnected ? "Conectado" : "Desconectado",
            badgeVariant: (isWhatsappConnected ? "secondary" : "outline") as
              | "secondary"
              | "outline",
            icon: MessageSquareIcon,
          },
          {
            id: "templates" as const,
            label: "Modelos do WhatsApp",
            badge: `${messageTemplates.length}`,
            badgeVariant: "outline" as const,
            icon: MessageSquareQuoteIcon,
          },
          {
            id: "nomenclature" as const,
            label: "Nomenclatura",
            status: currentTerminology.plural,
            icon: LayersIcon,
          },
          {
            id: "permissions" as const,
            label: "Módulos & Permissões",
            status: "Disponibilidade e papéis",
            icon: SlidersHorizontalIcon,
          },
        ]
      : []),
  ];

  const mobileSectionTitles: Record<MobileSettingsSection, string> = {
    account: "Minha Conta",
    theme: "Aparência & Tema",
    notifications: "Notificações",
    calendar: "Agenda & Calendário",
    pwa_offline: "Celular & Offline",
    security: "Segurança & Passkeys",
    about: "Sobre o OpenMinistry",
    church: "Dados da Igreja",
    whatsapp: "WhatsApp (Evolution API)",
    templates: "Modelos do WhatsApp",
    nomenclature: "Nomenclatura",
    permissions: "Módulos & Permissões",
  };

  function handleScopeChange(nextScope: SettingsScope) {
    setScope(nextScope);
    setActiveMobileSection(null);
  }

  function renderMobileSectionContent(section: MobileSettingsSection) {
    switch (section) {
      case "account":
        return <AccountProfileCard initialData={userData} />;
      case "theme":
        return <ThemePreferenceCard />;
      case "notifications":
        return <NotificationPreferencesCard />;
      case "calendar":
        return (
          <div className="space-y-6">
            <CalendarPreferencesCard initialPreferences={calendarPreferences} />
            <CalendarSyncCard feeds={calendarFeeds} />
          </div>
        );
      case "pwa_offline":
        return (
          <div className="space-y-6">
            <PwaInstallCard />
            <OfflineCacheCard />
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <PasskeysCard initialPasskeys={initialPasskeys} />
            <ChangePasswordCard />
            <ActiveSessionsCard initialSessions={initialSessions} />
          </div>
        );
      case "about":
        return <AboutCard />;
      case "church":
        return (
          <ChurchInfoCard
            organization={organization}
            isAdmin={isAdmin}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
          />
        );
      case "whatsapp":
        return evolutionSettings ? (
          <AdminEvolutionApiCard initialSettings={evolutionSettings} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                WhatsApp (Evolution API)
              </CardTitle>
              <CardDescription>
                A integração do WhatsApp ainda não está configurada para esta
                igreja.
              </CardDescription>
            </CardHeader>
          </Card>
        );
      case "templates":
        return (
          <MessageTemplatesCard
            initialTemplates={messageTemplates}
            churchName={organization.name}
          />
        );
      case "nomenclature":
        return (
          <ChurchNomenclatureCard
            initialNomenclature={churchMeta.departmentNomenclature}
          />
        );
      case "permissions":
        return permissionSettings ? (
          <ModulePermissionsCard initialSettings={permissionSettings} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Módulos & Permissões
              </CardTitle>
              <CardDescription>
                Não foi possível carregar as configurações de permissões no
                momento.
              </CardDescription>
            </CardHeader>
          </Card>
        );
    }
  }

  function renderDesktopAccountContent() {
    switch (accountTab) {
      case "profile":
        return (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AccountProfileCard initialData={userData} />

            <aside className="space-y-4">
              {/* Aparência rápida */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg tracking-tight">
                    Aparência rápida
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tema deste dispositivo ({currentThemeLabel}).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light", label: "Claro", icon: SunIcon },
                      { id: "dark", label: "Escuro", icon: MoonIcon },
                      { id: "system", label: "Sistema", icon: LaptopIcon },
                    ].map((opt) => {
                      const isSelected = mounted && theme === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTheme(opt.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "flex min-h-10 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            isSelected
                              ? "border-primary bg-secondary text-primary font-semibold"
                              : "border-border bg-background text-foreground hover:bg-muted/60",
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAccountTab("theme")}
                    className="h-8 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>Mais detalhes em Aparência</span>
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>

              {/* Acesso & Passkeys */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg tracking-tight">
                    Acesso & Passkeys
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {initialPasskeys.length}{" "}
                    {initialPasskeys.length === 1
                      ? "passkey registrada"
                      : "passkeys registradas"}{" "}
                    e {initialSessions.length}{" "}
                    {initialSessions.length === 1
                      ? "sessão ativa"
                      : "sessões ativas"}{" "}
                    neste aparelho.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAccountTab("security")}
                    className="w-full justify-center text-xs"
                  >
                    Abrir Segurança & Passkeys
                  </Button>
                </CardContent>
              </Card>

              {/* Igreja Summary */}
              <Card className="bg-muted/40">
                <CardHeader className="pb-3">
                  <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                    {isAdmin ? "Administração da igreja" : "Minha igreja"}
                  </span>
                  <CardTitle className="font-heading text-lg tracking-tight">
                    {organization.name}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {peopleCount} membros · {departmentsCount}{" "}
                    {currentTerminology.plural.toLowerCase()}
                    {isAdmin
                      ? ` · WhatsApp ${isWhatsappConnected ? "conectado" : "desconectado"} · ${messageTemplates.length} ${messageTemplates.length === 1 ? "modelo" : "modelos"}`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScope("church")}
                    className="w-full justify-center gap-2 bg-card text-xs font-semibold text-primary"
                  >
                    <span>
                      {isAdmin ? "Ir para Igreja (Admin)" : "Ver dados da igreja"}
                    </span>
                    <ArrowRightIcon className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        );
      case "calendar":
        return (
          <div className="max-w-3xl space-y-6">
            <CalendarPreferencesCard initialPreferences={calendarPreferences} />
            <CalendarSyncCard feeds={calendarFeeds} />
          </div>
        );
      case "notifications":
        return (
          <div className="max-w-3xl">
            <NotificationPreferencesCard />
          </div>
        );
      case "theme":
        return (
          <div className="max-w-3xl">
            <ThemePreferenceCard />
          </div>
        );
      case "security":
        return (
          <div className="max-w-3xl space-y-6">
            <PasskeysCard initialPasskeys={initialPasskeys} />
            <ChangePasswordCard />
            <ActiveSessionsCard initialSessions={initialSessions} />
          </div>
        );
      case "app":
        return (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <PwaInstallCard />
              <OfflineCacheCard />
            </div>
            <AboutCard />
          </div>
        );
    }
  }

  function renderDesktopChurchContent() {
    if (!isAdmin) {
      return (
        <div className="max-w-4xl">
          <ChurchInfoCard
            organization={organization}
            isAdmin={false}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
          />
        </div>
      );
    }

    switch (churchTab) {
      case "church":
        return (
          <div className="max-w-4xl">
            <ChurchInfoCard
              organization={organization}
              isAdmin={true}
              peopleCount={peopleCount}
              departmentsCount={departmentsCount}
            />
          </div>
        );
      case "whatsapp":
        return (
          <div className="max-w-3xl">
            {evolutionSettings ? (
              <AdminEvolutionApiCard initialSettings={evolutionSettings} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">
                    WhatsApp (Evolution API)
                  </CardTitle>
                  <CardDescription>
                    A integração do WhatsApp ainda não está configurada para
                    esta igreja.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        );
      case "templates":
        return (
          <div className="max-w-4xl">
            <MessageTemplatesCard
              initialTemplates={messageTemplates}
              churchName={organization.name}
            />
          </div>
        );
      case "permissions":
        return (
          <div className="max-w-4xl space-y-6">
            <ChurchNomenclatureCard
              initialNomenclature={churchMeta.departmentNomenclature}
            />
            {permissionSettings ? (
              <ModulePermissionsCard initialSettings={permissionSettings} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">
                    Módulos & Permissões
                  </CardTitle>
                  <CardDescription>
                    Não foi possível carregar as configurações de permissões no
                    momento.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        );
    }
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col",
        isModal ? "max-w-none gap-5" : "max-w-6xl gap-6",
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP LAYOUT · OPÇÃO A (FAIXA SUPERIOR + ESCOPO EU / IGREJA)     */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden md:flex md:flex-col md:gap-5">
        {!isModal ? (
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading text-3xl leading-none tracking-tight">
                  Configurações
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] font-normal text-muted-foreground"
                >
                  v{APP_VERSION}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Preferências pessoais de {userData.name} e{" "}
                {isAdmin ? "administração" : "dados"} de {organization.name}.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Escopo das configurações"
              className="inline-flex items-center gap-1 rounded-xl border bg-muted/70 p-1"
            >
              {(
                [
                  { id: "account", label: "Minha Conta", icon: UserIcon },
                  {
                    id: "church",
                    label: isAdmin ? "Igreja (Admin)" : "Igreja",
                    icon: Building2Icon,
                  },
                ] as const
              ).map((item) => {
                const isSelected = scope === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleScopeChange(item.id)}
                    onKeyDown={(e) =>
                      handleTablistArrowKey(
                        e,
                        ["account", "church"],
                        scope,
                        handleScopeChange,
                      )
                    }
                    className={cn(
                      "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </header>
        ) : null}

        {/* Faixa de sub-abas no padrão DomainSubtabs */}
        {scope === "account" ? (
          <nav
            role="tablist"
            aria-label="Seções de Minha Conta"
            className="flex w-full md:w-fit max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-muted/70 p-1"
          >
            {accountTabs.map((tab) => {
              const isSelected = accountTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setAccountTab(tab.id)}
                  onKeyDown={(e) =>
                    handleTablistArrowKey(
                      e,
                      accountTabs.map((t) => t.id),
                      accountTab,
                      setAccountTab,
                    )
                  }
                  className={cn(
                    "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 lg:px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-border/70 bg-card text-foreground shadow-2xs"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{tab.label}</span>
                  {tab.badge ? (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[11px] font-medium text-primary"
                    >
                      {tab.badge}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav
            role="tablist"
            aria-label="Seções da Igreja"
            className="flex w-full md:w-fit max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-muted/70 p-1"
          >
            {churchTabs.map((tab) => {
              const isSelected = churchTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setChurchTab(tab.id)}
                  onKeyDown={(e) =>
                    handleTablistArrowKey(
                      e,
                      churchTabs.map((t) => t.id),
                      churchTab,
                      setChurchTab,
                    )
                  }
                  className={cn(
                    "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 lg:px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-border/70 bg-card text-foreground shadow-2xs"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{tab.label}</span>
                  {tab.badge ? (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[11px] font-medium text-primary"
                    >
                      {tab.badge}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </nav>
        )}

        <div className="pt-1">
          {scope === "account"
            ? renderDesktopAccountContent()
            : renderDesktopChurchContent()}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE LAYOUT · OPÇÃO A (ESCOPO + LISTA CALMA COM STATUS INLINE)   */}
      {/* ------------------------------------------------------------------ */}
      <div className="block md:hidden">
        {activeMobileSection === null ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                Configurações
              </h1>

              {/* Alternador de Escopo Mobile (>= 44px touch targets) */}
              <div
                role="tablist"
                aria-label="Escopo das configurações no celular"
                className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/70 p-1"
              >
                {(
                  [
                    { id: "account", label: "Minha Conta" },
                    {
                      id: "church",
                      label: isAdmin ? "Igreja (Admin)" : "Igreja",
                    },
                  ] as const
                ).map((item) => {
                  const isSelected = scope === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setScope(item.id)}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground shadow-2xs"
                          : "text-foreground/80 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {scope === "account" ? (
              <div className="space-y-5">
                {/* Cartão de Perfil */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-12 shrink-0 ring-1 ring-border">
                      <AvatarImage
                        src={userData.image ?? undefined}
                        alt={userData.name}
                      />
                      <AvatarFallback className="bg-secondary font-heading text-base font-semibold text-primary">
                        {getInitials(userData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-heading text-base font-semibold text-foreground">
                        {userData.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {userData.username
                          ? `@${userData.username}`
                          : userData.email}{" "}
                        · {roleLabel(role)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveMobileSection("account")}
                    className="min-h-11 shrink-0 rounded-xl px-3.5 text-xs font-semibold text-primary"
                  >
                    Editar
                  </Button>
                </div>

                {/* Grupo Preferências */}
                <section className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Preferências
                  </h2>
                  <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60 shadow-2xs">
                    {mobilePreferenceRows.map((row) => (
                      <CalmSettingsRow
                        key={row.id}
                        item={row}
                        onSelect={setActiveMobileSection}
                      />
                    ))}
                  </div>
                </section>

                {/* Grupo Segurança & Sistema */}
                <section className="space-y-2">
                  <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Segurança & Sistema
                  </h2>
                  <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60 shadow-2xs">
                    {mobileSecurityRows.map((row) => (
                      <CalmSettingsRow
                        key={row.id}
                        item={row}
                        onSelect={setActiveMobileSection}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <section className="space-y-2">
                <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {isAdmin
                    ? "Administração da igreja"
                    : "Informações da igreja"}
                </h2>
                <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60 shadow-2xs">
                  {mobileChurchRows.map((row) => (
                    <CalmSettingsRow
                      key={row.id}
                      item={row}
                      onSelect={setActiveMobileSection}
                    />
                  ))}
                </div>
              </section>
            )}

            <footer className="flex items-center justify-between px-1 pt-1 text-[11px] text-muted-foreground">
              <span className="truncate">{organization.name}</span>
              <span className="shrink-0 font-mono">
                {APP_NAME} v{APP_VERSION}
              </span>
            </footer>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveMobileSection(null)}
                className="-ml-2 min-h-11 gap-1.5 px-2.5 text-sm font-medium text-primary"
              >
                <ChevronLeftIcon className="size-4" />
                Voltar
              </Button>
              <span className="truncate text-right font-heading text-base font-semibold text-foreground">
                {mobileSectionTitles[activeMobileSection]}
              </span>
            </div>

            <div className="space-y-6 pb-4">
              {renderMobileSectionContent(activeMobileSection)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CalmSettingsRow({
  item,
  onSelect,
}: {
  item: MobileRowItem;
  onSelect: (id: MobileSettingsSection) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
          <Icon className="size-4" />
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {item.label}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.badge ? (
          <Badge
            variant={item.badgeVariant ?? "secondary"}
            className="px-2 py-0.5 text-[11px] font-medium"
          >
            {item.badge}
          </Badge>
        ) : item.status ? (
          <span className="text-xs text-muted-foreground">{item.status}</span>
        ) : null}
        <ChevronRightIcon className="size-4 text-muted-foreground/60" />
      </div>
    </button>
  );
}
