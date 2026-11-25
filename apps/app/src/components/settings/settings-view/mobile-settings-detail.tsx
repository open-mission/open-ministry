"use client";

import { ChevronLeftIcon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalendarPreferences } from "@/lib/calendar";
import type { CalendarFeedView } from "@/lib/calendar-feed-data";
import type { DepartmentNomenclature } from "@/lib/church";

import type { MobileSettingsSection, SettingsViewProps } from "./types";

export const MOBILE_SECTION_TITLES: Record<MobileSettingsSection, string> = {
  account: "Minha Conta",
  theme: "Aparência & Tema",
  notifications: "Notificações",
  calendar: "Agenda & Calendário",
  pwa_offline: "Celular & Offline",
  security: "Segurança & Passkeys",
  about: "Sobre o OpenMinistry",
  church: "Dados da Igreja",
  whatsapp: "WhatsApp da Igreja",
  templates: "Modelos do WhatsApp",
  nomenclature: "Nomenclatura",
  permissions: "Módulos & Permissões",
};

type MobileSettingsDetailProps = {
  section: MobileSettingsSection;
  onBack: () => void;
  organization: SettingsViewProps["organization"];
  isAdmin: boolean;
  userData: SettingsViewProps["userData"];
  calendarPreferences: CalendarPreferences;
  calendarFeeds: CalendarFeedView[];
  initialSessions: SettingsViewProps["initialSessions"];
  initialPasskeys: SettingsViewProps["initialPasskeys"];
  peopleCount: number;
  departmentsCount: number;
  churchWhatsapp: SettingsViewProps["churchWhatsapp"];
  messageTemplates: SettingsViewProps["messageTemplates"];
  permissionSettings: SettingsViewProps["permissionSettings"];
  departmentNomenclature: DepartmentNomenclature | undefined;
};

function renderMobileSectionContent(
  section: MobileSettingsSection,
  {
    organization,
    isAdmin,
    userData,
    calendarPreferences,
    calendarFeeds,
    initialSessions,
    initialPasskeys,
    peopleCount,
    departmentsCount,
    churchWhatsapp,
    messageTemplates,
    permissionSettings,
    departmentNomenclature,
  }: Omit<MobileSettingsDetailProps, "section" | "onBack">,
) {
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
      return churchWhatsapp ? (
        <AdminEvolutionApiCard initialView={churchWhatsapp} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              WhatsApp da Igreja
            </CardTitle>
            <CardDescription>
              A integração do WhatsApp ainda não está disponível para esta
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
        <ChurchNomenclatureCard initialNomenclature={departmentNomenclature} />
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

export function MobileSettingsDetail({
  section,
  onBack,
  ...data
}: MobileSettingsDetailProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="-ml-2 min-h-11 gap-1.5 px-2.5 text-sm font-medium text-primary"
        >
          <ChevronLeftIcon className="size-4" />
          Voltar
        </Button>
        <span className="truncate text-right font-heading text-base font-semibold text-foreground">
          {MOBILE_SECTION_TITLES[section]}
        </span>
      </div>

      <div className="space-y-6 pb-4">
        {renderMobileSectionContent(section, data)}
      </div>
    </div>
  );
}
