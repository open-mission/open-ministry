"use client";

import type { KeyboardEvent } from "react";
import {
  Building2Icon,
  UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

import type { SettingsScope } from "./types";

export function handleTablistArrowKey<T extends string>(
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

type SettingsScopeSwitchProps = {
  userName: string;
  organizationName: string;
  isAdmin: boolean;
  scope: SettingsScope;
  onScopeChange: (scope: SettingsScope) => void;
};

export function SettingsScopeSwitch({
  userName,
  organizationName,
  isAdmin,
  scope,
  onScopeChange,
}: SettingsScopeSwitchProps) {
  return (
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
          Preferências pessoais de {userName} e{" "}
          {isAdmin ? "administração" : "dados"} de {organizationName}.
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
              onClick={() => onScopeChange(item.id)}
              onKeyDown={(e) =>
                handleTablistArrowKey(
                  e,
                  ["account", "church"],
                  scope,
                  onScopeChange,
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
  );
}
