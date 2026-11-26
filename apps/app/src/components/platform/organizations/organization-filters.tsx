"use client";

import { SearchIcon, XIcon } from "lucide-react";

import type { PlatformPlanView } from "@/app/actions/platform";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import type {
  OrganizationFilterOverrides,
  WhatsAppFilter,
} from "./use-organizations-list";

export function OrganizationFilters({
  search,
  statusFilter,
  planFilter,
  whatsappFilter,
  plans,
  isFiltering,
  onSearchChange,
  onStatusFilterChange,
  onPlanFilterChange,
  onWhatsappFilterChange,
  onApplyFilters,
  onClearFilters,
}: {
  search: string;
  statusFilter: string;
  planFilter: string;
  whatsappFilter: WhatsAppFilter;
  plans: PlatformPlanView[];
  isFiltering: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onWhatsappFilterChange: (value: WhatsAppFilter) => void;
  onApplyFilters: (next?: OrganizationFilterOverrides) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "" ||
    planFilter !== "" ||
    whatsappFilter !== "all";

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px_170px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onApplyFilters();
            }}
            className="relative"
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
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
              onStatusFilterChange(value);
              onApplyFilters({ status: value });
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
              onPlanFilterChange(value);
              onApplyFilters({ planId: value });
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
              const value = e.target.value as WhatsAppFilter;
              onWhatsappFilterChange(value);
              onApplyFilters({ whatsapp: value });
            }}
            className="min-h-11 w-full sm:min-h-9"
          >
            <NativeSelectOption value="all">WhatsApp: Todos</NativeSelectOption>
            <NativeSelectOption value="enabled">Habilitado</NativeSelectOption>
            <NativeSelectOption value="connected">Conectado</NativeSelectOption>
          </NativeSelect>
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isFiltering}
              onClick={onClearFilters}
              className="min-h-11 gap-2 sm:min-h-9"
            >
              <XIcon className="size-4" />
              Limpar filtros
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
