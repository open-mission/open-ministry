"use client";

import {
  BellIcon,
  Building2Icon,
  CalendarIcon,
  ChevronRightIcon,
  InfoIcon,
  LayersIcon,
  MessageSquareIcon,
  MessageSquareQuoteIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials, roleLabel } from "@/lib/format";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

import type {
  MobileRowItem,
  MobileSettingsSection,
  SettingsScope,
  SettingsViewProps,
} from "./types";

type MobileRowBuildArgs = {
  calendarFeedCount: number;
  currentThemeLabel: string;
  passkeyCount: number;
  peopleCount: number;
  departmentsCount: number;
  terminologyPlural: string;
  whatsappBadge: string;
  isWhatsappConnected: boolean;
  messageTemplatesCount: number;
};

export function buildMobilePreferenceRows({
  calendarFeedCount,
  currentThemeLabel,
}: Pick<
  MobileRowBuildArgs,
  "calendarFeedCount" | "currentThemeLabel"
>): MobileRowItem[] {
  return [
    {
      id: "calendar",
      label: "Agenda & Calendário",
      status:
        calendarFeedCount > 0
          ? `${calendarFeedCount} ${calendarFeedCount === 1 ? "link ativo" : "links ativos"}`
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
}

export function buildMobileSecurityRows({
  passkeyCount,
}: Pick<MobileRowBuildArgs, "passkeyCount">): MobileRowItem[] {
  return [
    {
      id: "security",
      label: "Segurança & Passkeys",
      status:
        passkeyCount > 0
          ? `${passkeyCount} ${passkeyCount === 1 ? "ativa" : "ativas"}`
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
}

export function buildMobileChurchRows({
  isAdmin,
  peopleCount,
  departmentsCount,
  terminologyPlural,
  whatsappBadge,
  isWhatsappConnected,
  messageTemplatesCount,
}: Pick<
  MobileRowBuildArgs,
  | "peopleCount"
  | "departmentsCount"
  | "terminologyPlural"
  | "whatsappBadge"
  | "isWhatsappConnected"
  | "messageTemplatesCount"
> & { isAdmin: boolean }): MobileRowItem[] {
  return [
    {
      id: "church",
      label: "Dados da Igreja",
      status: `${peopleCount} membros · ${departmentsCount} ${terminologyPlural}`,
      icon: Building2Icon,
    },
    ...(isAdmin
      ? [
          {
            id: "whatsapp" as const,
            label: "WhatsApp da Igreja",
            badge: whatsappBadge,
            badgeVariant: (isWhatsappConnected ? "secondary" : "outline") as
              | "secondary"
              | "outline",
            icon: MessageSquareIcon,
          },
          {
            id: "templates" as const,
            label: "Modelos do WhatsApp",
            badge: `${messageTemplatesCount}`,
            badgeVariant: "outline" as const,
            icon: MessageSquareQuoteIcon,
          },
          {
            id: "nomenclature" as const,
            label: "Nomenclatura",
            status: terminologyPlural,
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
}

type MobileSettingsListProps = {
  scope: SettingsScope;
  isAdmin: boolean;
  userData: SettingsViewProps["userData"];
  role: string;
  calendarFeedCount: number;
  currentThemeLabel: string;
  passkeyCount: number;
  peopleCount: number;
  departmentsCount: number;
  terminologyPlural: string;
  whatsappBadge: string;
  isWhatsappConnected: boolean;
  messageTemplatesCount: number;
  organizationName: string;
  onScopeChange: (scope: SettingsScope) => void;
  onSelectSection: (section: MobileSettingsSection) => void;
};

export function MobileSettingsList({
  scope,
  isAdmin,
  userData,
  role,
  calendarFeedCount,
  currentThemeLabel,
  passkeyCount,
  peopleCount,
  departmentsCount,
  terminologyPlural,
  whatsappBadge,
  isWhatsappConnected,
  messageTemplatesCount,
  organizationName,
  onScopeChange,
  onSelectSection,
}: MobileSettingsListProps) {
  const mobilePreferenceRows = buildMobilePreferenceRows({
    calendarFeedCount,
    currentThemeLabel,
  });
  const mobileSecurityRows = buildMobileSecurityRows({ passkeyCount });
  const mobileChurchRows = buildMobileChurchRows({
    isAdmin,
    peopleCount,
    departmentsCount,
    terminologyPlural,
    whatsappBadge,
    isWhatsappConnected,
    messageTemplatesCount,
  });

  return (
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
                onClick={() => onScopeChange(item.id)}
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
                  {userData.username ? `@${userData.username}` : userData.email}{" "}
                  · {roleLabel(role)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSelectSection("account")}
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
                  onSelect={onSelectSection}
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
                  onSelect={onSelectSection}
                />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {isAdmin ? "Administração da igreja" : "Informações da igreja"}
          </h2>
          <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60 shadow-2xs">
            {mobileChurchRows.map((row) => (
              <CalmSettingsRow
                key={row.id}
                item={row}
                onSelect={onSelectSection}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="flex items-center justify-between px-1 pt-1 text-[11px] text-muted-foreground">
        <span className="truncate">{organizationName}</span>
        <span className="shrink-0 font-mono">
          {APP_NAME} v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}

export function CalmSettingsRow({
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
      className="flex min-h-13.5 w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
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
