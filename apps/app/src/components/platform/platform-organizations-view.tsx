"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ActivityIcon,
  AlertTriangleIcon,
  Building2Icon,
  CheckCircle2Icon,
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import {
  getPlatformOrganizationAction,
  getPlatformOverviewAction,
  listPlatformOrganizationsAction,
  revokeOrganizationInstanceAction,
  updatePlatformOrganizationAction,
  type PlatformOrganizationRow,
  type PlatformPlanView,
} from "@/app/actions/platform";
import { PlatformConfirmDialog } from "@/components/platform/platform-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type OverviewData = Awaited<ReturnType<typeof getPlatformOverviewAction>>;
type OrganizationDetailData = Awaited<
  ReturnType<typeof getPlatformOrganizationAction>
>;

type PlatformOrganizationsViewProps = {
  initialOverview: OverviewData;
  initialOrganizations: PlatformOrganizationRow[];
  initialTotal: number;
  plans: PlatformPlanView[];
};

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Ativa",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  trial: {
    label: "Trial",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  suspended: {
    label: "Suspensa",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

function OrgStatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_MAP[status] ?? {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

function OrgWhatsAppBadge({
  whatsapp,
}: {
  whatsapp: PlatformOrganizationRow["whatsapp"];
}) {
  if (whatsapp.connectionStatus === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="size-2 rounded-full bg-emerald-500" />
        Conectado
      </span>
    );
  }
  if (whatsapp.hasInstance) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <span className="size-2 rounded-full bg-amber-500" />
        Aguardando QR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full bg-muted-foreground/40" />
      Sem instância
    </span>
  );
}

export function PlatformOrganizationsView({
  initialOverview,
  initialOrganizations,
  initialTotal,
  plans,
}: PlatformOrganizationsViewProps) {
  const isMobile = useIsMobile();

  const [overview, setOverview] = useState(initialOverview);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [total, setTotal] = useState(initialTotal);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState<
    "all" | "enabled" | "connected"
  >("all");

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganizationDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editable form state inside org detail panel
  const [editStatus, setEditStatus] = useState<"active" | "trial" | "suspended">(
    "active",
  );
  const [editPlanId, setEditPlanId] = useState<string>("");
  const [editWhatsappOverride, setEditWhatsappOverride] = useState<
    "inherit" | "enabled" | "disabled"
  >("inherit");
  const [editMaxInstances, setEditMaxInstances] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  const [isFiltering, startFiltering] = useTransition();
  const [isSavingOrg, startSavingOrg] = useTransition();
  const [isRevokingInstance, startRevokingInstance] = useTransition();

  const evolutionProvider = overview.providers.find(
    (p) => p.provider === "evolution_whatsapp",
  );

  function hydrateDetailForm(data: OrganizationDetailData) {
    const currentStatus =
      (data.settings?.status as "active" | "trial" | "suspended" | undefined) ??
      (data.organization?.status as
        | "active"
        | "trial"
        | "suspended"
        | undefined) ??
      "active";
    setEditStatus(currentStatus);
    setEditPlanId(data.settings?.planId ?? data.organization?.plan?.id ?? "");
    const overrides = data.settings?.featureOverrides ?? {};
    if (overrides.whatsapp_notifications === true) {
      setEditWhatsappOverride("enabled");
    } else if (overrides.whatsapp_notifications === false) {
      setEditWhatsappOverride("disabled");
    } else {
      setEditWhatsappOverride("inherit");
    }
    setEditMaxInstances(
      typeof overrides.whatsapp_max_instances === "number"
        ? String(overrides.whatsapp_max_instances)
        : "",
    );
    setEditNotes(data.settings?.notes ?? "");
  }

  async function refreshList(overrides?: {
    search?: string;
    status?: string;
    planId?: string;
    whatsapp?: "all" | "enabled" | "connected";
  }) {
    const q = overrides?.search ?? search;
    const st = overrides?.status ?? statusFilter;
    const pl = overrides?.planId ?? planFilter;
    const wa = overrides?.whatsapp ?? whatsappFilter;

    const [nextList, nextOverview] = await Promise.all([
      listPlatformOrganizationsAction({
        search: q.trim() || undefined,
        status: st || undefined,
        planId: pl || undefined,
        whatsapp: wa,
        limit: 50,
      }),
      getPlatformOverviewAction(),
    ]);
    setOrganizations(nextList.organizations);
    setTotal(nextList.total);
    setOverview(nextOverview);
  }

  function applyFilters(next?: {
    search?: string;
    status?: string;
    planId?: string;
    whatsapp?: "all" | "enabled" | "connected";
  }) {
    startFiltering(async () => {
      try {
        await refreshList(next);
      } catch {
        toast.error("Não foi possível atualizar a lista de organizações.");
      }
    });
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("");
    setPlanFilter("");
    setWhatsappFilter("all");
    applyFilters({ search: "", status: "", planId: "", whatsapp: "all" });
  }

  async function openOrgDetail(orgId: string) {
    setSelectedOrgId(orgId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getPlatformOrganizationAction(orgId);
      setDetail(res);
      hydrateDetailForm(res);
    } catch {
      toast.error("Não foi possível carregar os detalhes da igreja.");
      setSelectedOrgId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function commitSaveOrganization() {
    if (!selectedOrgId) return;
    startSavingOrg(async () => {
      const featureOverrides: Record<string, unknown> = {};
      if (editWhatsappOverride === "enabled") {
        featureOverrides.whatsapp_notifications = true;
      } else if (editWhatsappOverride === "disabled") {
        featureOverrides.whatsapp_notifications = false;
      }
      if (editMaxInstances.trim() !== "") {
        const parsedMax = Number(editMaxInstances);
        if (!Number.isNaN(parsedMax) && parsedMax >= 0) {
          featureOverrides.whatsapp_max_instances = parsedMax;
        }
      }

      const res = await updatePlatformOrganizationAction({
        organizationId: selectedOrgId,
        status: editStatus,
        planId: editPlanId || null,
        featureOverrides,
        notes: editNotes.trim() || null,
      });

      if (!res.ok) {
        toast.error(res.error || "Erro ao atualizar a organização.");
        return;
      }

      setConfirmSuspendOpen(false);
      const updated = await getPlatformOrganizationAction(selectedOrgId);
      setDetail(updated);
      hydrateDetailForm(updated);
      await refreshList();
      toast.success("Configurações da igreja atualizadas!");
    });
  }

  function handleSaveClick(e: React.FormEvent) {
    e.preventDefault();
    const previousStatus = detail?.organization?.status ?? "active";
    if (editStatus === "suspended" && previousStatus !== "suspended") {
      setConfirmSuspendOpen(true);
      return;
    }
    commitSaveOrganization();
  }

  function handleConfirmRevokeInstance() {
    if (!selectedOrgId) return;
    startRevokingInstance(async () => {
      const res = await revokeOrganizationInstanceAction(selectedOrgId);
      if (!res.ok) {
        toast.error(res.error || "Não foi possível revogar a instância.");
        return;
      }
      setConfirmRevokeOpen(false);
      const updated = await getPlatformOrganizationAction(selectedOrgId);
      setDetail(updated);
      hydrateDetailForm(updated);
      await refreshList();
      toast.success(
        res.error
          ? `Vínculo local removido (aviso do servidor: ${res.error}).`
          : "Instância de WhatsApp revogada com sucesso.",
      );
    });
  }

  const detailBody = detailLoading ? (
    <div className="space-y-4 p-5">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  ) : detail?.organization ? (
    <form
      id="org-detail-form"
      onSubmit={handleSaveClick}
      className="space-y-6 p-5"
    >
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
                setEditStatus(
                  e.target.value as "active" | "trial" | "suspended",
                )
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
              onChange={(e) => setEditPlanId(e.target.value)}
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
                setEditWhatsappOverride(
                  e.target.value as "inherit" | "enabled" | "disabled",
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
              onChange={(e) => setEditMaxInstances(e.target.value)}
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
              onClick={() => setConfirmRevokeOpen(true)}
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
          onChange={(e) => setEditNotes(e.target.value)}
        />
      </div>
    </form>
  ) : null;

  const detailFooter = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        disabled={isSavingOrg}
        onClick={() => setSelectedOrgId(null)}
        className="min-h-11 sm:min-h-9"
      >
        Fechar
      </Button>
      <Button
        type="submit"
        form="org-detail-form"
        disabled={isSavingOrg || detailLoading || !detail?.organization}
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Organizações da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão operacional de todas as igrejas, planos atribuídos, overrides e
            saúde do WhatsApp gerenciado.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isFiltering}
          onClick={() => applyFilters()}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          {isFiltering ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          Atualizar
        </Button>
      </header>

      {/* 3 KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Igrejas ativas</span>
              <Building2Icon className="size-4 text-primary" />
            </CardDescription>
            <CardTitle className="font-heading text-3xl tracking-tight">
              {overview.organizations.active}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {overview.organizations.total} total · {overview.organizations.trial}{" "}
            trial · {overview.organizations.suspended} suspensas
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>WhatsApp conectado</span>
              <MessageSquareIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
            <CardTitle className="font-heading text-3xl tracking-tight">
              {overview.whatsapp.connected}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {overview.whatsapp.enabled} instâncias ativas na plataforma
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Saúde Evolution Go</span>
              <ActivityIcon className="size-4 text-primary" />
            </CardDescription>
            <CardTitle className="flex items-center gap-2 font-heading text-2xl tracking-tight">
              {evolutionProvider?.isEnabled &&
              evolutionProvider.lastHealthStatus === "healthy" ? (
                <>
                  <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Online</span>
                </>
              ) : evolutionProvider ? (
                <span>
                  {evolutionProvider.isEnabled ? "Atenção" : "Pausada"}
                </span>
              ) : (
                <span>Não configurada</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {evolutionProvider?.lastHealthLatencyMs != null
                ? `Latência ${evolutionProvider.lastHealthLatencyMs}ms`
                : "Sem leitura recente"}
            </span>
            <Link
              href="/platform/integrations"
              className="font-medium text-primary hover:underline"
            >
              Configurar
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px_170px]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyFilters();
              }}
              className="relative"
            >
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar igreja por nome ou slug..."
                aria-label="Buscar igreja"
                className="min-h-11 pl-9 sm:min-h-9"
              />
            </form>

            <NativeSelect
              aria-label="Filtrar por status"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value;
                setStatusFilter(value);
                applyFilters({ status: value });
              }}
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="">Todos os status</NativeSelectOption>
              <NativeSelectOption value="active">Ativa</NativeSelectOption>
              <NativeSelectOption value="trial">Trial</NativeSelectOption>
              <NativeSelectOption value="suspended">Suspensa</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              aria-label="Filtrar por plano"
              value={planFilter}
              onChange={(e) => {
                const value = e.target.value;
                setPlanFilter(value);
                applyFilters({ planId: value });
              }}
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="">Todos os planos</NativeSelectOption>
              {plans.map((plan) => (
                <NativeSelectOption key={plan.id} value={plan.id}>
                  {plan.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <NativeSelect
              aria-label="Filtrar por WhatsApp"
              value={whatsappFilter}
              onChange={(e) => {
                const value = e.target.value as "all" | "enabled" | "connected";
                setWhatsappFilter(value);
                applyFilters({ whatsapp: value });
              }}
              className="min-h-11 w-full sm:min-h-9"
            >
              <NativeSelectOption value="all">WhatsApp: Todos</NativeSelectOption>
              <NativeSelectOption value="enabled">Habilitado</NativeSelectOption>
              <NativeSelectOption value="connected">Conectado</NativeSelectOption>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Building2Icon className="size-8 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="font-heading text-lg font-semibold">
                Nenhuma igreja encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                Ajuste a busca ou limpe os filtros para visualizar todas as
                organizações ({total}).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="min-h-11 sm:min-h-9"
            >
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Igreja</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{org.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {org.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {org.membersCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px]">
                        {org.plan?.name ?? "Padrão"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <OrgStatusBadge status={org.status} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <OrgWhatsAppBadge whatsapp={org.whatsapp} />
                        {org.whatsapp.connectedPhone ? (
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {org.whatsapp.connectedPhone}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void openOrgDetail(org.id)}
                        className="min-h-8 gap-1.5"
                      >
                        <Settings2Icon className="size-3.5" />
                        Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-base font-semibold">
                        {org.name}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {org.slug}
                      </p>
                    </div>
                    <OrgStatusBadge status={org.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {org.plan?.name ?? "Padrão"}
                      </Badge>
                      <span className="text-muted-foreground">
                        {org.membersCount} membros
                      </span>
                    </div>
                    <OrgWhatsAppBadge whatsapp={org.whatsapp} />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void openOrgDetail(org.id)}
                    className="min-h-11 w-full gap-2"
                  >
                    <Settings2Icon className="size-4" />
                    Gerenciar igreja
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detail Panel: 50% Desktop Sheet / Bottom Drawer Mobile */}
      {isMobile ? (
        <Drawer
          open={Boolean(selectedOrgId)}
          onOpenChange={(open) => {
            if (!open && !isSavingOrg && !isRevokingInstance) {
              setSelectedOrgId(null);
            }
          }}
        >
          <DrawerContent className="flex max-h-[85dvh] flex-col rounded-t-xl border-x-0 border-b-0 bg-popover p-0">
            <DrawerHeader className="shrink-0 border-b border-border/60 !text-left">
              <DrawerTitle className="font-heading text-xl tracking-tight">
                {detail?.organization?.name ?? "Detalhes da igreja"}
              </DrawerTitle>
              <DrawerDescription>
                Plano, limites de recursos e instância gerenciada da plataforma.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
              {detailBody}
            </div>
            <DrawerFooter className="shrink-0 border-t border-border/60 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))]">
              {detailFooter}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet
          open={Boolean(selectedOrgId)}
          onOpenChange={(open) => {
            if (!open && !isSavingOrg && !isRevokingInstance) {
              setSelectedOrgId(null);
            }
          }}
        >
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw] md:w-1/2 md:max-w-[50vw]"
          >
            <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-4">
              <SheetTitle className="font-heading text-xl tracking-tight">
                {detail?.organization?.name ?? "Detalhes da igreja"}
              </SheetTitle>
              <SheetDescription>
                Plano, limites de recursos e instância gerenciada da plataforma.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">{detailBody}</div>
            <SheetFooter className="shrink-0 border-t border-border/60 px-5 py-4">
              {detailFooter}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Confirmation Dialog: Suspend Organization */}
      <PlatformConfirmDialog
        open={confirmSuspendOpen}
        onOpenChange={setConfirmSuspendOpen}
        title="Suspender organização?"
        description={
          <>
            Ao suspender <strong>{detail?.organization?.name}</strong>, os
            entitlements e envios automáticos de WhatsApp desta igreja ficam
            bloqueados até a reativação.
          </>
        }
        confirmLabel="Confirmar suspensão"
        pending={isSavingOrg}
        onConfirm={commitSaveOrganization}
      />

      {/* Confirmation Dialog: Revoke Instance */}
      <PlatformConfirmDialog
        open={confirmRevokeOpen}
        onOpenChange={setConfirmRevokeOpen}
        title="Revogar instância do WhatsApp?"
        description={
          <>
            Esta ação desconecta a instância{" "}
            <strong className="font-mono">
              {detail?.channel?.instanceName}
            </strong>{" "}
            na Evolution Go e remove o vínculo da igreja{" "}
            <strong>{detail?.organization?.name}</strong>.
          </>
        }
        confirmLabel="Revogar instância"
        pending={isRevokingInstance}
        onConfirm={handleConfirmRevokeInstance}
      />
    </div>
  );
}
