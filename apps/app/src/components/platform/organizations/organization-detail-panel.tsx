"use client";

import type { FormEvent } from "react";
import {
  AlertTriangleIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import type { PlatformPlanView } from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format";

import { OrgStatusBadge, OrgWhatsAppBadge } from "./organization-badges";
import type {
  OrganizationDetailData,
  OrganizationStatus,
  WhatsAppOverride,
} from "./use-organization-detail-form";

export function OrganizationDetailBody({
  detail,
  detailLoading,
  plans,
  editStatus,
  onEditStatusChange,
  editPlanId,
  onEditPlanIdChange,
  editWhatsappOverride,
  onEditWhatsappOverrideChange,
  editMaxInstances,
  onEditMaxInstancesChange,
  editNotes,
  onEditNotesChange,
  onSubmit,
  onRequestRevoke,
}: {
  detail: OrganizationDetailData | null;
  detailLoading: boolean;
  plans: PlatformPlanView[];
  editStatus: OrganizationStatus;
  onEditStatusChange: (value: OrganizationStatus) => void;
  editPlanId: string;
  onEditPlanIdChange: (value: string) => void;
  editWhatsappOverride: WhatsAppOverride;
  onEditWhatsappOverrideChange: (value: WhatsAppOverride) => void;
  editMaxInstances: string;
  onEditMaxInstancesChange: (value: string) => void;
  editNotes: string;
  onEditNotesChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onRequestRevoke: () => void;
}) {
  if (detailLoading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!detail?.organization) return null;

  return (
    <form id="org-detail-form" onSubmit={onSubmit} className="space-y-6 p-5">
      {/* Church Quick Facts */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-3.5 text-xs">
        <OrgStatusBadge status={detail.organization.status} />
        <Badge variant="outline" className="font-mono text-[11px] font-normal">
          {detail.organization.slug}
        </Badge>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <UsersIcon className="size-3.5" />
          {detail.organization.membersCount} membros
        </span>
        <span className="text-muted-foreground">
          · Desde {formatDate(detail.organization.createdAt)}
        </span>
      </div>

      {/* Status & Plan */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Plano e Operação
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-detail-status">Status da igreja</Label>
            <NativeSelect
              id="org-detail-status"
              value={editStatus}
              onChange={(e) =>
                onEditStatusChange(e.target.value as OrganizationStatus)
              }
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="active">Ativa</NativeSelectOption>
              <NativeSelectOption value="trial">Trial</NativeSelectOption>
              <NativeSelectOption value="suspended">
                Suspensa
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-detail-plan">Plano vinculado</Label>
            <NativeSelect
              id="org-detail-plan"
              value={editPlanId}
              onChange={(e) => onEditPlanIdChange(e.target.value)}
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="">
                Plano padrão da plataforma
              </NativeSelectOption>
              {plans.map((plan) => (
                <NativeSelectOption key={plan.id} value={plan.id}>
                  {plan.name} ({plan.slug})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Feature Overrides */}
      <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontalIcon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Overrides de Recursos
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-wa-override" className="text-xs">
              WhatsApp automático
            </Label>
            <NativeSelect
              id="org-wa-override"
              value={editWhatsappOverride}
              onChange={(e) =>
                onEditWhatsappOverrideChange(
                  e.target.value as WhatsAppOverride,
                )
              }
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="inherit">
                Seguir regra do plano
              </NativeSelectOption>
              <NativeSelectOption value="enabled">
                Liberar manualmente
              </NativeSelectOption>
              <NativeSelectOption value="disabled">
                Bloquear manualmente
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-wa-max" className="text-xs">
              Limite de instâncias (override)
            </Label>
            <Input
              id="org-wa-max"
              type="number"
              min={0}
              max={20}
              placeholder="Herdar do plano"
              value={editMaxInstances}
              onChange={(e) => onEditMaxInstancesChange(e.target.value)}
              className="min-h-11 font-mono text-xs sm:min-h-9"
            />
          </div>
        </div>
      </div>

      {/* Managed WhatsApp Instance */}
      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Instância WhatsApp Gerenciada
            </h3>
          </div>
          <OrgWhatsAppBadge whatsapp={detail.organization.whatsapp} />
        </div>

        {detail.channel?.instanceName ? (
          <div className="space-y-3 text-xs">
            <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Instância: </span>
                <span className="font-mono font-medium text-foreground">
                  {detail.channel.instanceName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone: </span>
                <span className="font-mono font-medium text-foreground">
                  {detail.channel.connectedPhone || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Perfil: </span>
                <span className="font-medium text-foreground">
                  {detail.channel.connectedProfileName || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Última conexão: </span>
                <span className="text-foreground">
                  {detail.channel.lastConnectedAt
                    ? formatDateTime(detail.channel.lastConnectedAt)
                    : "—"}
                </span>
              </div>
            </div>

            {detail.channel.lastError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>{detail.channel.lastError}</span>
              </div>
            ) : null}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRequestRevoke}
              className="min-h-11 w-full gap-2 sm:min-h-9 sm:w-auto"
            >
              <Trash2Icon className="size-3.5" />
              Revogar instância
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Esta igreja ainda não criou uma instância gerenciada.
          </p>
        )}
      </div>

      {/* Internal Super Admin Notes */}
      <div className="space-y-2">
        <Label htmlFor="org-detail-notes">Notas internas da plataforma</Label>
        <Textarea
          id="org-detail-notes"
          rows={3}
          placeholder="Observações visíveis apenas para Super Admins (acordos, suporte, migrações)..."
          value={editNotes}
          onChange={(e) => onEditNotesChange(e.target.value)}
        />
      </div>
    </form>
  );
}

export function OrganizationDetailFooter({
  isSavingOrg,
  detailLoading,
  hasOrganization,
  onClose,
}: {
  isSavingOrg: boolean;
  detailLoading: boolean;
  hasOrganization: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        disabled={isSavingOrg}
        onClick={onClose}
        className="min-h-11 sm:min-h-9"
      >
        Fechar
      </Button>
      <Button
        type="submit"
        form="org-detail-form"
        disabled={isSavingOrg || detailLoading || !hasOrganization}
        className="min-h-11 gap-2 sm:min-h-9"
      >
        {isSavingOrg ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SaveIcon className="size-4" />
        )}
        Salvar alterações
      </Button>
    </div>
  );
}
