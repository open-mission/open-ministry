"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { cn } from "@/lib/utils";

import { DesktopAccountPanels } from "./settings-view/desktop-account-panels";
import { DesktopChurchPanels } from "./settings-view/desktop-church-panels";
import { MobileSettingsDetail } from "./settings-view/mobile-settings-detail";
import { MobileSettingsList } from "./settings-view/mobile-settings-list";
import { SettingsScopeSwitch } from "./settings-view/settings-scope-switch";
import { SettingsTabBar } from "./settings-view/settings-tab-bar";
import type { SettingsViewProps } from "./settings-view/types";
import {
  formatThemeLabel,
  useSettingsNavigation,
} from "./settings-view/use-settings-navigation";

export type {
  AccountTabId,
  ChurchTabId,
  MobileSettingsSection,
  SettingsScope,
  SettingsViewProps,
} from "./settings-view/types";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
  churchWhatsapp,
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

  const {
    scope,
    setScope,
    accountTab,
    setAccountTab,
    churchTab,
    setChurchTab,
    activeMobileSection,
    setActiveMobileSection,
    handleScopeChange,
  } = useSettingsNavigation({ isAdmin, initialScope, initialTab });

  const whatsappBadge =
    churchWhatsapp?.state === "connected"
      ? churchWhatsapp.isActive
        ? "Conectado"
        : "Pausado"
      : churchWhatsapp?.state === "pairing"
        ? "Aguardando QR"
        : churchWhatsapp?.state === "ready"
          ? "Pronto"
          : churchWhatsapp?.state === "blocked"
            ? "Bloqueado"
            : "Desconectado";
  const isWhatsappConnected =
    churchWhatsapp?.state === "connected" && churchWhatsapp.isActive;
  const feedsBadge =
    calendarFeeds.length > 0 ? `${calendarFeeds.length}` : undefined;
  const passkeysBadge =
    initialPasskeys.length > 0 ? `${initialPasskeys.length}` : undefined;

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
          <SettingsScopeSwitch
            userName={userData.name}
            organizationName={organization.name}
            isAdmin={isAdmin}
            scope={scope}
            onScopeChange={handleScopeChange}
          />
        ) : null}

        <SettingsTabBar
          scope={scope}
          isAdmin={isAdmin}
          accountTab={accountTab}
          churchTab={churchTab}
          onAccountTabChange={setAccountTab}
          onChurchTabChange={setChurchTab}
          feedsBadge={feedsBadge}
          passkeysBadge={passkeysBadge}
          whatsappBadge={whatsappBadge}
          messageTemplatesCount={messageTemplates.length}
        />

        <div className="pt-1">
          {scope === "account" ? (
            <DesktopAccountPanels
              accountTab={accountTab}
              userData={userData}
              initialSessions={initialSessions}
              initialPasskeys={initialPasskeys}
              calendarPreferences={calendarPreferences}
              calendarFeeds={calendarFeeds}
              theme={theme}
              setTheme={setTheme}
              mounted={mounted}
              currentThemeLabel={currentThemeLabel}
              organizationName={organization.name}
              isAdmin={isAdmin}
              peopleCount={peopleCount}
              departmentsCount={departmentsCount}
              terminologyPlural={currentTerminology.plural.toLowerCase()}
              isWhatsappConnected={isWhatsappConnected}
              messageTemplatesCount={messageTemplates.length}
              onAccountTabChange={setAccountTab}
              onScopeChange={handleScopeChange}
            />
          ) : (
            <DesktopChurchPanels
              churchTab={churchTab}
              isAdmin={isAdmin}
              organization={organization}
              peopleCount={peopleCount}
              departmentsCount={departmentsCount}
              churchWhatsapp={churchWhatsapp}
              messageTemplates={messageTemplates}
              permissionSettings={permissionSettings}
              departmentNomenclature={churchMeta.departmentNomenclature}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE LAYOUT · OPÇÃO A (ESCOPO + LISTA CALMA COM STATUS INLINE)   */}
      {/* ------------------------------------------------------------------ */}
      <div className="block md:hidden">
        {activeMobileSection === null ? (
          <MobileSettingsList
            scope={scope}
            isAdmin={isAdmin}
            userData={userData}
            role={role}
            calendarFeedCount={calendarFeeds.length}
            currentThemeLabel={currentThemeLabel}
            passkeyCount={initialPasskeys.length}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
            terminologyPlural={currentTerminology.plural.toLowerCase()}
            whatsappBadge={whatsappBadge}
            isWhatsappConnected={isWhatsappConnected}
            messageTemplatesCount={messageTemplates.length}
            organizationName={organization.name}
            onScopeChange={setScope}
            onSelectSection={setActiveMobileSection}
          />
        ) : (
          <MobileSettingsDetail
            section={activeMobileSection}
            onBack={() => setActiveMobileSection(null)}
            organization={organization}
            isAdmin={isAdmin}
            userData={userData}
            calendarPreferences={calendarPreferences}
            calendarFeeds={calendarFeeds}
            initialSessions={initialSessions}
            initialPasskeys={initialPasskeys}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
            churchWhatsapp={churchWhatsapp}
            messageTemplates={messageTemplates}
            permissionSettings={permissionSettings}
            departmentNomenclature={churchMeta.departmentNomenclature}
          />
        )}
      </div>
    </div>
  );
}
