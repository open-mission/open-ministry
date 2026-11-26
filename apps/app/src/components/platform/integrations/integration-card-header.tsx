"use client";

import type { ReactNode } from "react";

import type { PlatformIntegrationView } from "@/app/actions/platform";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  IntegrationHealthBadge,
  IntegrationSourceBadge,
} from "./integration-badges";
import type { HealthFeedback } from "./types";

export function IntegrationCardHeader({
  icon,
  title,
  description,
  integration,
  health,
  isEnabled,
  onEnabledChange,
  switchId,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  integration: PlatformIntegrationView;
  health: HealthFeedback;
  isEnabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  switchId: string;
}) {
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading text-xl tracking-tight">
                {title}
              </CardTitle>
              <IntegrationSourceBadge source={integration.source} />
              <IntegrationHealthBadge health={health} isEnabled={isEnabled} />
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start rounded-lg border border-border/70 bg-muted/30 px-3 py-2 sm:self-center">
          <Label
            htmlFor={switchId}
            className="text-xs font-medium text-foreground cursor-pointer"
          >
            Provedor habilitado
          </Label>
          <Switch
            id={switchId}
            checked={isEnabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>
    </CardHeader>
  );
}
