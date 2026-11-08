"use client";

import { useState } from "react";
import {
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChurchIcon,
  HardDriveIcon,
  InfoIcon,
  LayersIcon,
  MessageSquareIcon,
  MessageSquareQuoteIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";

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
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { ChurchInfoCard } from "@/components/settings/church-info-card";
import { ChurchNomenclatureCard } from "@/components/settings/church-nomenclature-card";
import { MessageTemplatesCard } from "@/components/settings/message-templates-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { OfflineCacheCard } from "@/components/settings/offline-cache-card";
import { PasskeysCard } from "@/components/settings/passkeys-card";
import { PwaInstallCard } from "@/components/settings/pwa-install-card";
import { ThemePreferenceCard } from "@/components/settings/theme-preference-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarPreferences } from "@/lib/calendar";
import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { getInitials, roleLabel } from "@/lib/format";
import type { ResolvedTemplate } from "@/lib/message-templates";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_VERSION } from "@/lib/version";

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
  initialSessions: SessionItem[];
  initialPasskeys: PasskeyViewItem[];
  peopleCount: number;
  departmentsCount: number;
  evolutionSettings: EvolutionSettingsView | null;
  messageTemplates: ResolvedTemplate[];
  isModal?: boolean;
};

export type SettingsSection =
  | "account"
  | "calendar"
  | "theme"
  | "pwa"
  | "offline"
  | "security"
  | "notifications"
  | "whatsapp"
  | "templates"
  | "church"
  | "nomenclature"
  | "about";

type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  subtitle: string;
  icon: typeof UserIcon;
  color: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
};

type SettingsNavCategory = {
  title: string;
  items: SettingsNavItem[];
};

export function SettingsView({
  organization,
  role,
  isAdmin,
  userData,
  calendarPreferences,
  initialSessions,
  initialPasskeys,
  peopleCount,
  departmentsCount,
  evolutionSettings,
  messageTemplates,
  isModal = false,
}: SettingsViewProps) {
  const churchMeta = parseChurchMetadata(organization.metadata);
  const currentTerminology = getDepartmentTerminology(churchMeta);

  // Mobile active section for iOS style drill-down
  const [activeMobileSection, setActiveMobileSection] =
    useState<SettingsSection | null>(null);

  // Desktop active section
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  // Navegação lateral organizada por categorias (espelhando a lógica mobile)
  const navCategories: SettingsNavCategory[] = [
    {
      title: "Geral & Preferências",
      items: [
        {
          id: "account" as const,
          label: "Minha Conta",
          subtitle: "Perfil, aniversário e telefone",
          icon: UserIcon,
          color: "bg-blue-500 text-white",
        },
        {
          id: "calendar" as const,
          label: "Agenda & Calendário",
          subtitle: "Início da semana e fuso",
          icon: CalendarIcon,
          color: "bg-amber-500 text-white",
        },
        {
          id: "theme" as const,
          label: "Aparência & Tema",
          subtitle: "Claro, Escuro ou Sistema",
          icon: PaletteIcon,
          color: "bg-violet-500 text-white",
        },
        {
          id: "pwa" as const,
          label: "Instalar no Celular",
          subtitle: "Aplicativo na tela inicial (PWA)",
          icon: SmartphoneIcon,
          color: "bg-teal-600 text-white",
        },
        {
          id: "offline" as const,
          label: "Modo Offline & Cache",
          subtitle: "Escalas e dados salvos no aparelho",
          icon: HardDriveIcon,
          color: "bg-indigo-600 text-white",
        },
      ],
    },
    {
      title: "Segurança",
      items: [
        {
          id: "security" as const,
          label: "Segurança & Passkeys",
          subtitle: `${initialPasskeys.length} chave(s) · Sessões`,
          icon: ShieldCheckIcon,
          color: "bg-emerald-500 text-white",
        },
      ],
    },
    {
      title: "Comunicação",
      items: [
        {
          id: "notifications" as const,
          label: "Notificações",
          subtitle: "Alertas no sino e push",
          icon: BellIcon,
          color: "bg-rose-500 text-white",
        },
        ...(isAdmin && evolutionSettings
          ? [
              {
                id: "whatsapp" as const,
                label: "WhatsApp (Evolution API)",
                subtitle: evolutionSettings.instanceName || "Instância Go",
                icon: MessageSquareIcon,
                color: "bg-emerald-600 text-white",
                badge: evolutionSettings.isActive ? "Ativo" : "Inativo",
                badgeVariant: (evolutionSettings.isActive
                  ? "default"
                  : "secondary") as "default" | "secondary",
              },
            ]
          : []),
        ...(isAdmin
          ? [
              {
                id: "templates" as const,
                label: "Modelos do WhatsApp",
                subtitle: "Convites, escalas e avisos",
                icon: MessageSquareQuoteIcon,
                color: "bg-primary text-white",
              },
            ]
          : []),
      ],
    },
    {
      title: "Igreja & Comunidade",
      items: [
        {
          id: "church" as const,
          label: isAdmin ? "Identidade & Governança" : "Informações da Igreja",
          subtitle: `${organization.name} · ${peopleCount} pessoas`,
          icon: ChurchIcon,
          color: "bg-amber-600 text-white",
        },
        ...(isAdmin
          ? [
              {
                id: "nomenclature" as const,
                label: "Nomenclatura",
                subtitle: `${currentTerminology.plural} (${currentTerminology.singular})`,
                icon: LayersIcon,
                color: "bg-orange-500 text-white",
              },
            ]
          : []),
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          id: "about" as const,
          label: "Sobre o OpenMinistry",
          subtitle: `v${APP_VERSION} · Créditos e info`,
          icon: InfoIcon,
          color: "bg-sky-600 text-white",
          badge: `v${APP_VERSION}`,
          badgeVariant: "outline" as const,
        },
      ],
    },
  ];

  // Render do conteúdo da seção ativa no Desktop
  function renderSectionContent(section: SettingsSection) {
    switch (section) {
      case "account":
        return <AccountProfileCard initialData={userData} />;
      case "calendar":
        return (
          <CalendarPreferencesCard initialPreferences={calendarPreferences} />
        );
      case "theme":
        return <ThemePreferenceCard />;
      case "pwa":
        return <PwaInstallCard />;
      case "offline":
        return <OfflineCacheCard />;
      case "security":
        return (
          <div className="space-y-6">
            <PasskeysCard initialPasskeys={initialPasskeys} />
            <ChangePasswordCard />
            <ActiveSessionsCard initialSessions={initialSessions} />
          </div>
        );
      case "notifications":
        return <NotificationPreferencesCard />;
      case "whatsapp":
        return evolutionSettings ? (
          <AdminEvolutionApiCard initialSettings={evolutionSettings} />
        ) : null;
      case "templates":
        return (
          <MessageTemplatesCard
            initialTemplates={messageTemplates}
            churchName={organization.name}
          />
        );
      case "church":
        return (
          <ChurchInfoCard
            organization={organization}
            isAdmin={isAdmin}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
          />
        );
      case "nomenclature":
        return (
          <ChurchNomenclatureCard
            initialNomenclature={churchMeta.departmentNomenclature}
          />
        );
      case "about":
        return <AboutCard />;
      default:
        return null;
    }
  }

  return (
    <div className={cn("mx-auto flex w-full flex-col", isModal ? "max-w-none" : "max-w-6xl gap-6 sm:gap-8")}>
      {/* Page Header (apenas na página comum, não dentro do modal onde o DialogHeader já atua) */}
      {!isModal ? (
        <header className="border-b pb-4">
          <h1 className="font-heading text-3xl sm:text-4xl leading-none tracking-tight">
            Configurações
          </h1>
        </header>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP LAYOUT COM SIDEBAR LATERAL                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden md:flex min-h-[580px] rounded-2xl border bg-card overflow-hidden shadow-xs">
        {/* Sidebar Lateral de Configurações */}
        <aside className="w-72 shrink-0 border-r bg-muted/20 flex flex-col justify-between">
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            {/* Resumo do Usuário no topo do Sidebar Lateral */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-background border">
              <Avatar className="size-10 rounded-lg">
                <AvatarImage src={userData.image ?? undefined} alt={userData.name} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(userData.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight">
                  {userData.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {organization.name} · {roleLabel(role)}
                </p>
              </div>
            </div>

            {/* Grupos de Navegação */}
            <nav className="space-y-4">
              {navCategories.map((cat) => (
                <div key={cat.title} className="space-y-1">
                  <span className="px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    {cat.title}
                  </span>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const isSelected = activeSection === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground font-medium shadow-xs"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-lg",
                                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : item.color,
                              )}
                            >
                              <Icon className="size-3.5" />
                            </div>
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge ? (
                            <Badge
                              variant={item.badgeVariant || (isSelected ? "secondary" : "outline")}
                              className={cn(
                                "text-[10px] py-0 px-1 font-mono",
                                isSelected ? "bg-primary-foreground/20 text-primary-foreground border-transparent" : "",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer do Sidebar Lateral com Versão do App */}
          <div className="border-t p-3 bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-heading font-medium text-foreground">
              {APP_NAME}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
              v{APP_VERSION}
            </Badge>
          </div>
        </aside>

        {/* Painel de Conteúdo da Seção Ativa */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[calc(85vh-40px)] bg-background">
          <div className="max-w-3xl space-y-6">
            {renderSectionContent(activeSection)}
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE LAYOUT (iOS Drill-down Style)                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="block md:hidden">
        {activeMobileSection === null ? (
          // Lista Principal de Configurações no Celular
          <div className="space-y-5">
            {/* Card do Usuário */}
            <div
              onClick={() => setActiveMobileSection("account")}
              className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-2xs transition-colors active:bg-muted/60 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar className="size-14 ring-2 ring-border shrink-0">
                  <AvatarImage
                    src={userData.image ?? undefined}
                    alt={userData.name}
                  />
                  <AvatarFallback className="bg-primary/10 font-heading text-lg text-primary">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="font-heading text-base font-semibold text-foreground truncate">
                    {userData.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {userData.username ? `@${userData.username}` : userData.email}
                  </p>
                  <p className="text-[11px] font-medium text-primary">
                    {organization.name} · {roleLabel(role)}
                  </p>
                </div>
              </div>
              <ChevronRightIcon className="size-5 text-muted-foreground/50 shrink-0 ml-2" />
            </div>

            {/* Categorias iOS */}
            {navCategories.map((cat) => (
              <div key={cat.title} className="space-y-1.5">
                <span className="px-3 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  {cat.title}
                </span>
                <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50 shadow-2xs">
                  {cat.items.map((item) => (
                    <IosSettingsRow
                      key={item.id}
                      icon={item.icon}
                      iconBg={item.color}
                      title={item.label}
                      subtitle={item.subtitle}
                      badge={item.badge}
                      badgeVariant={item.badgeVariant}
                      onClick={() => setActiveMobileSection(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Versão no Rodapé do Mobile */}
            <div className="py-4 text-center space-y-1">
              <p className="font-heading text-xs font-semibold text-muted-foreground">
                {APP_NAME}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground/60">
                Versão {APP_VERSION} · Open-source
              </p>
            </div>
          </div>
        ) : (
          // Visualização Detalhada com Barra Superior iOS
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMobileSection(null)}
                className="gap-1.5 -ml-2 text-primary font-medium hover:bg-transparent h-9 px-2 text-sm"
              >
                <ChevronLeftIcon className="size-4" />
                Voltar
              </Button>
              {(() => {
                const activeItem = navCategories
                  .flatMap((c) => c.items)
                  .find((item) => item.id === activeMobileSection);
                return activeItem ? (
                  <span className="font-heading text-sm font-semibold text-foreground truncate flex-1 text-right">
                    {activeItem.label}
                  </span>
                ) : null;
              })()}
            </div>

            {/* Conteúdo da Seção no Mobile */}
            <div className="space-y-6">
              {renderSectionContent(activeMobileSection)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type IosSettingsRowProps = {
  icon: typeof UserIcon;
  iconBg: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  onClick: () => void;
};

function IosSettingsRow({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  badge,
  badgeVariant = "secondary",
  onClick,
}: IosSettingsRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3.5 transition-colors active:bg-muted/70 hover:bg-muted/40 cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs",
            iconBg,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground tracking-tight truncate">
            {title}
          </p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground truncate leading-none">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {badge ? (
          <Badge
            variant={badgeVariant}
            className="text-[10px] font-mono font-normal"
          >
            {badge}
          </Badge>
        ) : null}
        <ChevronRightIcon className="size-4 text-muted-foreground/50" />
      </div>
    </div>
  );
}
