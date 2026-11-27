"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getPlatformOverviewAction,
  listPlatformOrganizationsAction,
  type PlatformOrganizationRow,
} from "@/app/actions/platform";

export type OverviewData = Awaited<
  ReturnType<typeof getPlatformOverviewAction>
>;

export type WhatsAppFilter = "all" | "enabled" | "connected";

export type OrganizationFilterOverrides = {
  search?: string;
  status?: string;
  planId?: string;
  whatsapp?: WhatsAppFilter;
};

export function useOrganizationsList({
  initialOverview,
  initialOrganizations,
  initialTotal,
}: {
  initialOverview: OverviewData;
  initialOrganizations: PlatformOrganizationRow[];
  initialTotal: number;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [total, setTotal] = useState(initialTotal);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState<WhatsAppFilter>("all");

  const [isFiltering, startFiltering] = useTransition();

  async function refreshList(overrides?: OrganizationFilterOverrides) {
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

  function applyFilters(next?: OrganizationFilterOverrides) {
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

  return {
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
  };
}
