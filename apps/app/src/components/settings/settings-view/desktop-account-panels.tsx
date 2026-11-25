"use client";

import {
  ArrowRightIcon,
  ChevronRightIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";

import { AccountProfileCard } from "@/components/settings/account-profile-card";
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card";
import { CalendarPreferencesCard } from "@/components/settings/calendar-preferences-card";
import { CalendarSyncCard } from "@/components/settings/calendar-sync-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { OfflineCacheCard } from "@/components/settings/offline-cache-card";
import { PasskeysCard } from "@/components/settings/passkeys-card";
import { PwaInstallCard } from "@/components/settings/pwa-install-card";
import { ThemePreferenceCard } from "@/components/settings/theme-preference-card";
import { AboutCard } from "@/components/settings/about-card";
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
import { cn } from "@/lib/utils";

import type {
  AccountTabId,
  SettingsScope,
  SettingsViewProps,
} from "./types";

type DesktopAccountPanelsProps = {
  accountTab: AccountTabId;
  userData: SettingsViewProps["userData"];
  initialSessions: SettingsViewProps["initialSessions"];
  initialPasskeys: SettingsViewProps["initialPasskeys"];
  calendarPreferences: CalendarPreferences;
  calendarFeeds: CalendarFeedView[];
  theme: string | undefined;
  setTheme: (theme: string) => void;
  mounted: boolean;
  currentThemeLabel: string;
  organizationName: string;
  isAdmin: boolean;
  peopleCount: number;
  departmentsCount: number;
  terminologyPlural: string;
  isWhatsappConnected: boolean;
  messageTemplatesCount: number;
  onAccountTabChange: (tab: AccountTabId) => void;
  onScopeChange: (scope: SettingsScope) => void;
};

export function DesktopAccountPanels({
  accountTab,
  userData,
  initialSessions,
  initialPasskeys,
  calendarPreferences,
  calendarFeeds,
  theme,
  setTheme,
  mounted,
  currentThemeLabel,
  organizationName,
  isAdmin,
  peopleCount,
  departmentsCount,
  terminologyPlural,
  isWhatsappConnected,
  messageTemplatesCount,
  onAccountTabChange,
  onScopeChange,
}: DesktopAccountPanelsProps) {
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
                  onClick={() => onAccountTabChange("theme")}
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
                  onClick={() => onAccountTabChange("security")}
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
                  {organizationName}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {peopleCount} membros · {departmentsCount}{" "}
                  {terminologyPlural}
                  {isAdmin
                    ? ` · WhatsApp ${isWhatsappConnected ? "conectado" : "desconectado"} · ${messageTemplatesCount} ${messageTemplatesCount === 1 ? "modelo" : "modelos"}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onScopeChange("church")}
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
