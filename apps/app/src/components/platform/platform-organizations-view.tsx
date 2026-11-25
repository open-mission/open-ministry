"use client";

import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import {
  getPlatformOrganizationAction,
  revokeOrganizationInstanceAction,
  updatePlatformOrganizationAction,
  type PlatformOrganizationRow,
  type PlatformPlanView,
} from "@/app/actions/platform";
import { PlatformConfirmDialog } from "@/components/platform/platform-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  OrganizationDetailBody,
  OrganizationDetailFooter,
} from "./organizations/organization-detail-panel";
import { OrganizationFilters } from "./organizations/organization-filters";
import { OrganizationKpis } from "./organizations/organization-kpis";
import { OrganizationList } from "./organizations/organization-list";
import {
  useOrganizationDetailForm,
  type OrganizationDetailData,
} from "./organizations/use-organization-detail-form";
import {
  useOrganizationsList,
  type OverviewData,
} from "./organizations/use-organizations-list";

type PlatformOrganizationsViewProps = {
  initialOverview: OverviewData;
  initialOrganizations: PlatformOrganizationRow[];
  initialTotal: number;
  plans: PlatformPlanView[];
};

export function PlatformOrganizationsView({
  initialOverview,
  initialOrganizations,
  initialTotal,
  plans,
}: PlatformOrganizationsViewProps) {
  const isMobile = useIsMobile();

  const {
    overview,
    organizations,
    total,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    planFilter,
    setPlanFilter,
    whatsappFilter,
    setWhatsappFilter,
    isFiltering,
    refreshList,
    applyFilters,
    handleClearFilters,
  } = useOrganizationsList({
    initialOverview,
    initialOrganizations,
    initialTotal,
  });

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganizationDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  const [isSavingOrg, startSavingOrg] = useTransition();
  const [isRevokingInstance, startRevokingInstance] = useTransition();

  const form = useOrganizationDetailForm();

  async function openOrgDetail(orgId: string) {
    setSelectedOrgId(orgId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getPlatformOrganizationAction(orgId);
      setDetail(res);
      form.hydrateDetailForm(res);
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
      const res = await updatePlatformOrganizationAction({
        organizationId: selectedOrgId,
        ...form.buildUpdatePayload(),
      });

      if (!res.ok) {
        toast.error(res.error || "Erro ao atualizar a organização.");
        return;
      }

      setConfirmSuspendOpen(false);
      const updated = await getPlatformOrganizationAction(selectedOrgId);
      setDetail(updated);
      form.hydrateDetailForm(updated);
      await refreshList();
      toast.success("Configurações da igreja atualizadas!");
    });
  }

  function handleSaveClick(e: FormEvent) {
    e.preventDefault();
    const previousStatus = detail?.organization?.status ?? "active";
    if (form.editStatus === "suspended" && previousStatus !== "suspended") {
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
      form.hydrateDetailForm(updated);
      await refreshList();
      toast.success(
        res.error
          ? `Vínculo local removido (aviso do servidor: ${res.error}).`
          : "Instância de WhatsApp revogada com sucesso.",
      );
    });
  }

  const detailBody = (
    <OrganizationDetailBody
      detail={detail}
      detailLoading={detailLoading}
      plans={plans}
      editStatus={form.editStatus}
      onEditStatusChange={form.setEditStatus}
      editPlanId={form.editPlanId}
      onEditPlanIdChange={form.setEditPlanId}
      editWhatsappOverride={form.editWhatsappOverride}
      onEditWhatsappOverrideChange={form.setEditWhatsappOverride}
      editMaxInstances={form.editMaxInstances}
      onEditMaxInstancesChange={form.setEditMaxInstances}
      editNotes={form.editNotes}
      onEditNotesChange={form.setEditNotes}
      onSubmit={handleSaveClick}
      onRequestRevoke={() => setConfirmRevokeOpen(true)}
    />
  );

  const detailFooter = (
    <OrganizationDetailFooter
      isSavingOrg={isSavingOrg}
      detailLoading={detailLoading}
      hasOrganization={Boolean(detail?.organization)}
      onClose={() => setSelectedOrgId(null)}
    />
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

      <OrganizationKpis overview={overview} />

      <OrganizationFilters
        search={search}
        statusFilter={statusFilter}
        planFilter={planFilter}
        whatsappFilter={whatsappFilter}
        plans={plans}
        isFiltering={isFiltering}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onPlanFilterChange={setPlanFilter}
        onWhatsappFilterChange={setWhatsappFilter}
        onApplyFilters={applyFilters}
        onClearFilters={handleClearFilters}
      />

      <OrganizationList
        organizations={organizations}
        total={total}
        onOpenDetail={(orgId) => void openOrgDetail(orgId)}
        onClearFilters={handleClearFilters}
      />

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
