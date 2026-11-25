"use client";

import { useState } from "react";

import type {
  AccountTabId,
  ChurchTabId,
  MobileSettingsSection,
  SettingsScope,
} from "./types";

const CHURCH_SCOPE_TABS = [
  "church",
  "whatsapp",
  "templates",
  "permissions",
  "nomenclature",
];

const ACCOUNT_TABS: readonly AccountTabId[] = [
  "profile",
  "calendar",
  "notifications",
  "theme",
  "security",
  "app",
];

const CHURCH_TABS: readonly ChurchTabId[] = [
  "church",
  "whatsapp",
  "templates",
  "permissions",
];

export function formatThemeLabel(theme: string | undefined): string {
  if (theme === "dark") return "Escuro";
  if (theme === "light") return "Claro";
  return "Sistema";
}

export function resolveInitialScope(
  initialScope?: SettingsScope,
  initialTab?: string,
): SettingsScope {
  if (initialScope === "church") return "church";
  if (initialTab && CHURCH_SCOPE_TABS.includes(initialTab)) return "church";
  return "account";
}

export function resolveInitialAccountTab(initialTab?: string): AccountTabId {
  if (
    initialTab &&
    ACCOUNT_TABS.includes(initialTab as AccountTabId)
  ) {
    return initialTab as AccountTabId;
  }
  return "profile";
}

export function resolveInitialChurchTab(
  isAdmin: boolean,
  initialTab?: string,
): ChurchTabId {
  if (
    isAdmin &&
    initialTab &&
    CHURCH_TABS.includes(initialTab as ChurchTabId)
  ) {
    return initialTab as ChurchTabId;
  }
  return "church";
}

type UseSettingsNavigationArgs = {
  isAdmin: boolean;
  initialScope?: SettingsScope;
  initialTab?: string;
};

export function useSettingsNavigation({
  isAdmin,
  initialScope,
  initialTab,
}: UseSettingsNavigationArgs) {
  const [scope, setScope] = useState<SettingsScope>(() =>
    resolveInitialScope(initialScope, initialTab),
  );
  const [accountTab, setAccountTab] = useState<AccountTabId>(() =>
    resolveInitialAccountTab(initialTab),
  );
  const [churchTab, setChurchTab] = useState<ChurchTabId>(() =>
    resolveInitialChurchTab(isAdmin, initialTab),
  );
  const [activeMobileSection, setActiveMobileSection] =
    useState<MobileSettingsSection | null>(null);

  function handleScopeChange(nextScope: SettingsScope) {
    setScope(nextScope);
    setActiveMobileSection(null);
  }

  return {
    scope,
    setScope,
    accountTab,
    setAccountTab,
    churchTab,
    setChurchTab,
    activeMobileSection,
    setActiveMobileSection,
    handleScopeChange,
  } as const;
}
