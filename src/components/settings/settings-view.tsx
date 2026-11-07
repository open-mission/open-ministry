"use client";

import { useState } from "react";
import {
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChurchIcon,
  CrownIcon,
  MessageSquareIcon,
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
import { AccountProfileCard } from "@/components/settings/account-profile-card";
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card";
import { AdminChurchSettingsCard } from "@/components/settings/admin-church-settings-card";
import { AdminEvolutionApiCard } from "@/components/settings/admin-evolution-api-card";
import { CalendarPreferencesCard } from "@/components/settings/calendar-preferences-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { PasskeysCard } from "@/components/settings/passkeys-card";
import { PwaInstallCard } from "@/components/settings/pwa-install-card";
import { ThemePreferenceCard } from "@/components/settings/theme-preference-card";
import type { CalendarPreferences } from "@/lib/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getInitials, roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type SettingsViewProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
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
};

type MobileSection =
  | "account"
  | "calendar"
  | "theme"
  | "pwa"
  | "security"
  | "notifications"
  | "church"
  | "whatsapp"
  | null;

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
}: SettingsViewProps) {
  // Mobile active section for iOS style drill-down
  const [activeMobileSection, setActiveMobileSection] =
    useState<MobileSection>(null);

  // Desktop active tab
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      {/* Page Header */}
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl sm:text-4xl leading-none tracking-tight">
            Configurações
          </h1>
          <Badge variant="outline" className="text-xs font-normal">
            {roleLabel(role)}
          </Badge>
          {isAdmin ? (
            <Badge className="bg-primary text-primary-foreground gap-1 text-xs font-normal">
              <CrownIcon className="size-3" />
              Administração
            </Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Gerencie os dados da sua conta, chaves de acesso biométricas (passkeys),
          sessões ativas, preferências e recursos da sua igreja.
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP LAYOUT (Tabs) - Visible on md:block and above               */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="w-fit justify-start p-1 h-auto flex-wrap">
            <TabsTrigger value="account" className="gap-2 py-2 px-3">
              <UserIcon className="size-4" />
              Minha Conta
            </TabsTrigger>

            <TabsTrigger value="security" className="gap-2 py-2 px-3">
              <ShieldCheckIcon className="size-4" />
              Segurança & Passkeys
            </TabsTrigger>

            <TabsTrigger value="notifications" className="gap-2 py-2 px-3">
              <BellIcon className="size-4" />
              Notificações
            </TabsTrigger>

            {isAdmin ? (
              <TabsTrigger value="church" className="gap-2 py-2 px-3">
                <ChurchIcon className="size-4" />
                Igreja & Governança
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <AccountProfileCard initialData={userData} />
            <CalendarPreferencesCard initialPreferences={calendarPreferences} />
            <ThemePreferenceCard />
            <PwaInstallCard />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <PasskeysCard initialPasskeys={initialPasskeys} />
            <ChangePasswordCard />
            <ActiveSessionsCard initialSessions={initialSessions} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationPreferencesCard />
            {isAdmin && evolutionSettings ? (
              <AdminEvolutionApiCard initialSettings={evolutionSettings} />
            ) : null}
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="church" className="space-y-6">
              <AdminChurchSettingsCard
                organization={organization}
                peopleCount={peopleCount}
                departmentsCount={departmentsCount}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE LAYOUT (iOS Settings Style) - Visible on screens < md       */}
      {/* ------------------------------------------------------------------ */}
      <div className="block md:hidden">
        {activeMobileSection === null ? (
          // Main iOS Settings Menu List
          <div className="space-y-5">
            {/* Apple ID Style Profile Row */}
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

            {/* Group 1: Conta & Aparência */}
            <div className="space-y-1.5">
              <span className="px-3 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Geral &amp; Preferências
              </span>
              <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50 shadow-2xs">
                <IosSettingsRow
                  icon={UserIcon}
                  iconBg="bg-blue-500 text-white"
                  title="Minha Conta"
                  subtitle="Perfil, aniversário e telefone"
                  onClick={() => setActiveMobileSection("account")}
                />
                <IosSettingsRow
                  icon={CalendarIcon}
                  iconBg="bg-amber-500 text-white"
                  title="Agenda &amp; Calendário"
                  subtitle="Início da semana e fuso horário"
                  onClick={() => setActiveMobileSection("calendar")}
                />
                <IosSettingsRow
                  icon={PaletteIcon}
                  iconBg="bg-violet-500 text-white"
                  title="Aparência &amp; Tema"
                  subtitle="Claro, Escuro ou Sistema"
                  onClick={() => setActiveMobileSection("theme")}
                />
                <IosSettingsRow
                  icon={SmartphoneIcon}
                  iconBg="bg-teal-600 text-white"
                  title="Instalar no Celular"
                  subtitle="Aplicativo na tela inicial (PWA)"
                  onClick={() => setActiveMobileSection("pwa")}
                />
              </div>
            </div>

            {/* Group 2: Segurança */}
            <div className="space-y-1.5">
              <span className="px-3 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Segurança
              </span>
              <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50 shadow-2xs">
                <IosSettingsRow
                  icon={ShieldCheckIcon}
                  iconBg="bg-emerald-500 text-white"
                  title="Segurança &amp; Passkeys"
                  subtitle={`${initialPasskeys.length} chave(s) · Sessões`}
                  onClick={() => setActiveMobileSection("security")}
                />
              </div>
            </div>

            {/* Group 3: Notificações */}
            <div className="space-y-1.5">
              <span className="px-3 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Comunicação
              </span>
              <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50 shadow-2xs">
                <IosSettingsRow
                  icon={BellIcon}
                  iconBg="bg-rose-500 text-white"
                  title="Notificações"
                  subtitle="Alertas do painel e aplicativo"
                  onClick={() => setActiveMobileSection("notifications")}
                />
              </div>
            </div>

            {/* Group 4: Igreja & Administração (If Admin) */}
            {isAdmin ? (
              <div className="space-y-1.5">
                <span className="px-3 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Administração da Igreja
                </span>
                <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/50 shadow-2xs">
                  <IosSettingsRow
                    icon={ChurchIcon}
                    iconBg="bg-amber-500 text-white"
                    title="Identidade da Igreja"
                    subtitle={`${organization.name} · ${peopleCount} pessoas`}
                    onClick={() => setActiveMobileSection("church")}
                  />
                  {evolutionSettings ? (
                    <IosSettingsRow
                      icon={MessageSquareIcon}
                      iconBg="bg-emerald-600 text-white"
                      title="WhatsApp (Evolution API)"
                      badge={
                        evolutionSettings.isActive
                          ? "Ativo"
                          : "Inativo"
                      }
                      badgeVariant={
                        evolutionSettings.isActive
                          ? "default"
                          : "secondary"
                      }
                      subtitle={
                        evolutionSettings.instanceName || "Não configurado"
                      }
                      onClick={() => setActiveMobileSection("whatsapp")}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          // Drill-down Detail View with iOS Navigation Bar
          <div className="space-y-5">
            {/* Top Navigation Bar with Back Button */}
            <div className="flex items-center justify-between pb-1 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMobileSection(null)}
                className="gap-1 -ml-2 text-primary font-medium hover:bg-transparent h-9 px-2"
              >
                <ChevronLeftIcon className="size-5" />
                Configurações
              </Button>

              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {activeMobileSection === "account" && "Minha Conta"}
                {activeMobileSection === "calendar" && "Agenda & Calendário"}
                {activeMobileSection === "theme" && "Aparência"}
                {activeMobileSection === "security" && "Segurança"}
                {activeMobileSection === "notifications" && "Notificações"}
                {activeMobileSection === "church" && "Identidade da Igreja"}
                {activeMobileSection === "whatsapp" && "WhatsApp (Evolution)"}
              </span>
            </div>

            {/* Section Contents */}
            {activeMobileSection === "account" && (
              <div className="space-y-6">
                <AccountProfileCard initialData={userData} />
              </div>
            )}

            {activeMobileSection === "calendar" && (
              <div className="space-y-6">
                <CalendarPreferencesCard initialPreferences={calendarPreferences} />
              </div>
            )}

            {activeMobileSection === "theme" && (
              <div className="space-y-6">
                <ThemePreferenceCard />
              </div>
            )}

            {activeMobileSection === "pwa" && (
              <div className="space-y-6">
                <PwaInstallCard />
              </div>
            )}

            {activeMobileSection === "security" && (
              <div className="space-y-6">
                <PasskeysCard initialPasskeys={initialPasskeys} />
                <ChangePasswordCard />
                <ActiveSessionsCard initialSessions={initialSessions} />
              </div>
            )}

            {activeMobileSection === "notifications" && (
              <div className="space-y-6">
                <NotificationPreferencesCard />
              </div>
            )}

            {activeMobileSection === "church" && isAdmin && (
              <div className="space-y-6">
                <AdminChurchSettingsCard
                  organization={organization}
                  peopleCount={peopleCount}
                  departmentsCount={departmentsCount}
                />
              </div>
            )}

            {activeMobileSection === "whatsapp" && isAdmin && evolutionSettings && (
              <div className="space-y-6">
                <AdminEvolutionApiCard initialSettings={evolutionSettings} />
              </div>
            )}
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
