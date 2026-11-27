"use client";

import {
  BellIcon,
  Building2Icon,
  CalendarIcon,
  MessageSquareIcon,
  MessageSquareQuoteIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { handleTablistArrowKey } from "./settings-scope-switch";
import type {
  AccountTabId,
  ChurchTabId,
  DesktopTabItem,
  SettingsScope,
} from "./types";

type SettingsTabBarProps = {
  scope: SettingsScope;
  isAdmin: boolean;
  accountTab: AccountTabId;
  churchTab: ChurchTabId;
  onAccountTabChange: (tab: AccountTabId) => void;
  onChurchTabChange: (tab: ChurchTabId) => void;
  feedsBadge?: string;
  passkeysBadge?: string;
  whatsappBadge: string;
  messageTemplatesCount: number;
};

function buildAccountTabs(
  feedsBadge?: string,
  passkeysBadge?: string,
): DesktopTabItem<AccountTabId>[] {
  return [
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
}

function buildChurchTabs(
  isAdmin: boolean,
  whatsappBadge: string,
  messageTemplatesCount: number,
): DesktopTabItem<ChurchTabId>[] {
  if (!isAdmin) {
    return [{ id: "church", label: "Dados da Igreja", icon: Building2Icon }];
  }

  return [
    { id: "church", label: "Dados da Igreja", icon: Building2Icon },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageSquareIcon,
      badge: whatsappBadge,
    },
    {
      id: "templates",
      label: "Modelos",
      icon: MessageSquareQuoteIcon,
      badge: `${messageTemplatesCount}`,
    },
    {
      id: "permissions",
      label: "Equipes & Permissões",
      icon: SlidersHorizontalIcon,
    },
  ];
}

export function SettingsTabBar({
  scope,
  isAdmin,
  accountTab,
  churchTab,
  onAccountTabChange,
  onChurchTabChange,
  feedsBadge,
  passkeysBadge,
  whatsappBadge,
  messageTemplatesCount,
}: SettingsTabBarProps) {
  if (scope === "account") {
    const accountTabs = buildAccountTabs(feedsBadge, passkeysBadge);

    return (
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
              onClick={() => onAccountTabChange(tab.id)}
              onKeyDown={(e) =>
                handleTablistArrowKey(
                  e,
                  accountTabs.map((t) => t.id),
                  accountTab,
                  onAccountTabChange,
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
    );
  }

  const churchTabs = buildChurchTabs(
    isAdmin,
    whatsappBadge,
    messageTemplatesCount,
  );

  return (
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
            onClick={() => onChurchTabChange(tab.id)}
            onKeyDown={(e) =>
              handleTablistArrowKey(
                e,
                churchTabs.map((t) => t.id),
                churchTab,
                onChurchTabChange,
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
  );
}
