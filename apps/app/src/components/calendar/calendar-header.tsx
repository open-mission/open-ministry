"use client";

import { useState } from "react";
import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  Music2Icon,
  XIcon,
} from "lucide-react";

import { CalendarActions } from "@/components/calendar/calendar-actions";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AGENDA_WINDOW_DAYS,
  formatCalendarDate,
  type CalendarFilterType,
  type CalendarViewMode,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarHeaderProps = {
  currentDate: Date;
  viewMode: CalendarViewMode;
  filterType: CalendarFilterType;
  selectedDepartmentId: string;
  departments?: { id: string; name: string }[];
  weekStartsOn: 0 | 1;
  timeZone?: string | null;
  totalCount: number;
  eventsCount: number;
  assignmentsCount: number;
  unavailabilitiesCount: number;
  birthdaysCount: number;
  weekAssignmentsCount: number;
  canViewTeamAvailability?: boolean;
  canCreateEvent?: boolean;
  canCreateRehearsal?: boolean;
  canViewSchedules?: boolean;
  showSidebarToggle?: boolean;
  onViewChange: (view: CalendarViewMode) => void;
  onFilterChange: (filter: CalendarFilterType) => void;
  onDepartmentChange: (departmentId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onExport: () => void;
};

export type FilterOption = {
  id: CalendarFilterType;
  label: string;
  count: number;
};

const DESKTOP_VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "agenda", label: "Agenda" },
  { value: "day", label: "Dia" },
  { value: "year", label: "Ano" },
];

export function buildFilterOptions(
  counts: {
    total: number;
    assignments: number;
    events: number;
    unavailabilities: number;
    birthdays: number;
  },
  canViewTeamAvailability: boolean,
): FilterOption[] {
  return [
    { id: "all", label: "Todos", count: counts.total },
    { id: "assignments", label: "Minhas escalas", count: counts.assignments },
    { id: "events", label: "Cultos e eventos", count: counts.events },
    {
      id: "unavailabilities",
      label: canViewTeamAvailability ? "Indisponibilidades" : "Indisp.",
      count: counts.unavailabilities,
    },
    { id: "birthdays", label: "Aniversários", count: counts.birthdays },
  ];
}

export function FilterPanelBody({
  filterOptions,
  filterType,
  departments,
  selectedDepartmentId,
  compact,
  onFilterChange,
  onDepartmentChange,
}: {
  filterOptions: FilterOption[];
  filterType: CalendarFilterType;
  departments: { id: string; name: string }[];
  selectedDepartmentId: string;
  compact: boolean;
  onFilterChange: (filter: CalendarFilterType) => void;
  onDepartmentChange: (departmentId: string) => void;
}) {
  const rowHeight = compact ? "h-9" : "h-11";

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1" role="group" aria-label="Tipo de compromisso">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de compromisso
        </p>
        {filterOptions.map((option) => {
          const isActive = filterType === option.id;
          const isEmpty = option.id !== "all" && option.count === 0 && !isActive;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isEmpty}
              aria-pressed={isActive}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs transition-colors",
                rowHeight,
                isActive
                  ? "bg-secondary font-semibold text-primary"
                  : "text-foreground hover:bg-muted/60",
                isEmpty && "cursor-not-allowed opacity-45 hover:bg-transparent",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <CheckIcon
                  className={cn(
                    "size-3.5 shrink-0 transition-opacity",
                    isActive ? "opacity-100 text-primary" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{option.label}</span>
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                  isActive
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {departments.length > 0 ? (
        <div
          className="flex flex-col gap-1 border-t pt-3"
          role="group"
          aria-label="Filtrar por departamento"
        >
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Departamento
          </p>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-0.5">
            {[
              { id: "all", name: "Todos os departamentos" },
              ...departments,
            ].map((department) => {
              const isSelected = selectedDepartmentId === department.id;
              return (
                <button
                  key={department.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onDepartmentChange(department.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs transition-colors",
                    rowHeight,
                    isSelected
                      ? "bg-secondary font-semibold text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "size-3.5 shrink-0 transition-opacity",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{department.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CalendarHeader({
  currentDate,
  viewMode,
  filterType,
  selectedDepartmentId,
  departments = [],
  weekStartsOn,
  timeZone,
  totalCount,
  eventsCount,
  assignmentsCount,
  unavailabilitiesCount,
  birthdaysCount,
  weekAssignmentsCount,
  canViewTeamAvailability = false,
  canCreateEvent = false,
  canCreateRehearsal = false,
  canViewSchedules = false,
  showSidebarToggle = false,
  onViewChange,
  onFilterChange,
  onDepartmentChange,
  onPrev,
  onNext,
  onToday,
  onExport,
}: CalendarHeaderProps) {
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);

  function getPeriodLabel() {
    if (viewMode === "year") {
      return formatCalendarDate(currentDate, "yyyy", {
        timeZone,
        locale: ptBR,
      });
    }
    if (viewMode === "agenda") {
      const end = addDays(currentDate, AGENDA_WINDOW_DAYS - 1);
      const startLabel = formatCalendarDate(currentDate, "d 'de' MMM", {
        timeZone,
        locale: ptBR,
      });
      const endLabel = formatCalendarDate(end, "d 'de' MMM", {
        timeZone,
        locale: ptBR,
      });
      return `${startLabel} – ${endLabel}`;
    }
    if (viewMode === "day") {
      const formatted = formatCalendarDate(
        currentDate,
        "EEEE, d 'de' MMMM",
        {
          timeZone,
          locale: ptBR,
        },
      );
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn });
      const end = endOfWeek(currentDate, { weekStartsOn });
      const startMonth = formatCalendarDate(start, "MMM", {
        timeZone,
        locale: ptBR,
      });
      const endMonth = formatCalendarDate(end, "MMM 'de' yyyy", {
        timeZone,
        locale: ptBR,
      });
      if (start.getMonth() === end.getMonth()) {
        return `${formatCalendarDate(start, "d", { timeZone })} – ${formatCalendarDate(end, "d 'de' MMMM 'de' yyyy", { timeZone, locale: ptBR })}`;
      }
      return `${formatCalendarDate(start, "d", { timeZone })} ${startMonth} – ${formatCalendarDate(end, "d", { timeZone })} ${endMonth}`;
    }
    const label = formatCalendarDate(currentDate, "MMMM 'de' yyyy", {
      timeZone,
      locale: ptBR,
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const defaultDateInput = format(currentDate, "yyyy-MM-dd");

  const filterOptions = buildFilterOptions(
    {
      total: totalCount,
      assignments: assignmentsCount,
      events: eventsCount,
      unavailabilities: unavailabilitiesCount,
      birthdays: birthdaysCount,
    },
    canViewTeamAvailability,
  );

  const activeFilterOption = filterOptions.find((option) => option.id === filterType);
  const activeDepartment = departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (selectedDepartmentId !== "all" && activeDepartment ? 1 : 0);

  function handleResetFilters() {
    onFilterChange("all");
    onDepartmentChange("all");
  }

  const desktopNavGroup = (
    <ButtonGroup aria-label="Navegação do período">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        aria-label="Período anterior"
        className="size-9 rounded-xl bg-card"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onToday}
        className="h-9 rounded-xl bg-card px-3 text-xs font-semibold"
      >
        Hoje
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        aria-label="Próximo período"
        className="size-9 rounded-xl bg-card"
      >
        <ChevronRightIcon className="size-4" aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );

  return (
    <header className="flex shrink-0 flex-col gap-3">
      {/* Desktop: barra única unificada (Período + Navegação | Filtrar + 5 Visões + Novo) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-2.5 xl:flex-nowrap">
        <div className="flex min-w-0 items-center gap-3">
          {showSidebarToggle ? (
            <SidebarTrigger className="hidden shrink-0 lg:inline-flex" />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground xl:text-3xl">
              {getPeriodLabel()}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>
                {totalCount === 0
                  ? "Sem compromissos neste período"
                  : `${totalCount} ${totalCount === 1 ? "compromisso" : "compromissos"}`}
              </span>
              {weekAssignmentsCount > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onFilterChange("assignments")}
                    className="inline-flex min-h-6 items-center gap-1 rounded-md px-1 font-semibold text-primary transition-colors hover:bg-secondary/60"
                  >
                    <Music2Icon className="size-3" aria-hidden="true" />
                    <span>
                      Sua semana: {weekAssignmentsCount}{" "}
                      {weekAssignmentsCount === 1 ? "escala" : "escalas"}
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {desktopNavGroup}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Popover open={desktopFilterOpen} onOpenChange={setDesktopFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label="Filtrar agenda"
                className={cn(
                  "h-9 gap-2 rounded-xl bg-card px-3 text-xs font-medium",
                  activeFilterCount > 0 &&
                    "border-primary/35 bg-secondary font-semibold text-primary hover:bg-secondary/80",
                )}
              >
                <FilterIcon className="size-3.5" aria-hidden="true" />
                <span>Filtrar</span>
                {activeFilterCount > 0 ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-semibold tabular-nums text-primary">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-xl p-3.5">
              <PopoverHeader className="flex-row items-center justify-between border-b pb-2.5">
                <PopoverTitle className="text-sm font-semibold text-foreground">
                  Filtros
                </PopoverTitle>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Limpar
                  </button>
                ) : null}
              </PopoverHeader>

              <FilterPanelBody
                filterOptions={filterOptions}
                filterType={filterType}
                departments={departments}
                selectedDepartmentId={selectedDepartmentId}
                compact
                onFilterChange={onFilterChange}
                onDepartmentChange={onDepartmentChange}
              />
            </PopoverContent>
          </Popover>

          <Tabs
            value={viewMode}
            onValueChange={(value) => onViewChange(value as CalendarViewMode)}
            className="shrink-0"
          >
            <TabsList
              aria-label="Visualizações da agenda"
              className="h-9 rounded-xl bg-muted/70 p-1"
            >
              {DESKTOP_VIEW_OPTIONS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="h-7 rounded-lg px-2.5 text-xs font-medium data-[state=active]:font-semibold xl:px-3"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <CalendarActions
            departments={departments}
            defaultDate={defaultDateInput}
            canCreateEvent={canCreateEvent}
            canCreateRehearsal={canCreateRehearsal}
            canViewSchedules={canViewSchedules}
            onExport={onExport}
            variant="desktop"
          />
        </div>
      </div>

      {/* Desktop: chips removíveis apenas quando houver filtro ativo */}
      {activeFilterCount > 0 ? (
        <div className="hidden items-center gap-2 md:flex">
          {filterType !== "all" && activeFilterOption ? (
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              aria-label={`Remover filtro ${activeFilterOption.label}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/25 bg-secondary/70 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              <span>{activeFilterOption.label}</span>
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}

          {activeDepartment ? (
            <button
              type="button"
              onClick={() => onDepartmentChange("all")}
              aria-label={`Remover departamento ${activeDepartment.name}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/25 bg-secondary/70 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              <span className="max-w-40 truncate">{activeDepartment.name}</span>
              <XIcon className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
