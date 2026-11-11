"use client";

import { useState } from "react";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  ListIcon,
} from "lucide-react";

import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  calendarDateKey,
  formatCalendarDate,
  type CalendarFilterType,
  type CalendarPreferences,
  type CalendarRange,
  type CalendarViewMode,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarHeaderProps = {
  currentDate: Date;
  viewMode: CalendarViewMode;
  filterType: CalendarFilterType;
  selectedDepartmentId?: string;
  preferences: CalendarPreferences;
  visibleRange: CalendarRange;
  onViewChange: (view: CalendarViewMode) => void;
  onFilterChange: (filter: CalendarFilterType) => void;
  onDepartmentChange?: (departmentId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onExport: () => void;
  itemsCount: {
    total: number;
    events: number;
    assignments: number;
    unavailabilities: number;
    birthdays?: number;
  };
  canCreateEvent?: boolean;
  canViewTeamAvailability?: boolean;
  departments?: { id: string; name: string }[];
};

type FilterOption = {
  value: CalendarFilterType;
  label: string;
  count: number;
  icon?: typeof CalendarDaysIcon;
  activeClassName: string;
  idleClassName: string;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function CalendarHeader({
  currentDate,
  viewMode,
  filterType,
  selectedDepartmentId = "all",
  preferences,
  visibleRange,
  onViewChange,
  onFilterChange,
  onDepartmentChange,
  onPrev,
  onNext,
  onToday,
  onExport,
  itemsCount,
  canCreateEvent,
  canViewTeamAvailability,
  departments,
}: CalendarHeaderProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timeZone = preferences.timezone;

  function getPeriodLabel() {
    switch (viewMode) {
      case "month":
        return capitalizeFirst(
          formatCalendarDate(currentDate, "MMMM 'de' yyyy", {
            timeZone,
            locale: ptBR,
          }),
        );
      case "week": {
        const start = formatCalendarDate(
          visibleRange.start,
          "d 'de' MMM",
          { timeZone, locale: ptBR },
        );
        const end = formatCalendarDate(
          visibleRange.end,
          "d 'de' MMM 'de' yyyy",
          { timeZone, locale: ptBR },
        );
        return capitalizeFirst(`${start} – ${end}`);
      }
      case "day":
        return capitalizeFirst(
          formatCalendarDate(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", {
            timeZone,
            locale: ptBR,
          }),
        );
      case "year":
        return formatCalendarDate(currentDate, "yyyy", { timeZone });
      case "agenda": {
        const range = `${formatCalendarDate(
          visibleRange.start,
          "d 'de' MMM",
          { timeZone, locale: ptBR },
        )} – ${formatCalendarDate(
          visibleRange.end,
          "d 'de' MMM 'de' yyyy",
          { timeZone, locale: ptBR },
        )}`;
        return calendarDateKey(currentDate, timeZone) ===
          calendarDateKey(new Date(), timeZone)
          ? `Próximos 30 dias · ${range}`
          : `30 dias · ${capitalizeFirst(range)}`;
      }
    }
  }

  const filterOptions: FilterOption[] = [
    {
      value: "all",
      label: "Todos",
      count: itemsCount.total,
      activeClassName:
        "bg-foreground text-background border-foreground shadow-2xs font-semibold",
      idleClassName:
        "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
    },
    {
      value: "events",
      label: "Cultos e eventos",
      count: itemsCount.events,
      icon: CalendarDaysIcon,
      activeClassName:
        "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold",
      idleClassName:
        "bg-primary/5 text-primary border-primary/10 hover:bg-primary/10",
    },
    {
      value: "assignments",
      label: "Minhas escalas",
      count: itemsCount.assignments,
      icon: CheckCircle2Icon,
      activeClassName:
        "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold dark:bg-emerald-500 dark:text-emerald-950",
      idleClassName:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15",
    },
    {
      value: "unavailabilities",
      label: canViewTeamAvailability
        ? "Indisponibilidades"
        : "Minhas indisponibilidades",
      count: itemsCount.unavailabilities,
      icon: CalendarX2Icon,
      activeClassName:
        "bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold dark:bg-amber-400 dark:text-amber-950",
      idleClassName:
        "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/25 hover:bg-amber-500/15",
    },
    {
      value: "birthdays",
      label: "Aniversários",
      count: itemsCount.birthdays ?? 0,
      icon: CakeIcon,
      activeClassName:
        "bg-rose-600 text-white border-rose-600 shadow-2xs font-semibold dark:bg-rose-400 dark:text-rose-950",
      idleClassName:
        "bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-500/25 hover:bg-rose-500/15",
    },
  ];

  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (selectedDepartmentId !== "all" ? 1 : 0);

  function renderFilterChip(option: FilterOption, className?: string) {
    const Icon = option.icon;
    const isActive = filterType === option.value;
    const isDisabled = option.count === 0 && !isActive;

    return (
      <button
        key={option.value}
        type="button"
        aria-pressed={isActive}
        disabled={isDisabled}
        title={
          isDisabled
            ? "Nenhum item deste tipo no período visível"
            : option.label
        }
        onClick={() => {
          onFilterChange(option.value);
          setFiltersOpen(false);
        }}
        className={cn(
          "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-45",
          isActive ? option.activeClassName : option.idleClassName,
          className,
        )}
      >
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        <span>{option.label}</span>
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            isActive ? "opacity-80" : "opacity-60",
          )}
        >
          {option.count}
        </span>
      </button>
    );
  }

  const departmentSelect = departments && departments.length > 0 &&
    onDepartmentChange ? (
    <NativeSelect
      aria-label="Filtrar por departamento"
      value={selectedDepartmentId}
      onChange={(event) => onDepartmentChange(event.target.value)}
      className="min-w-44 [&_select]:h-9 [&_select]:text-xs"
    >
      <NativeSelectOption value="all">
        Todos os departamentos
      </NativeSelectOption>
      {departments.map((department) => (
        <NativeSelectOption key={department.id} value={department.id}>
          {department.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  ) : null;

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          aria-label="Exportar agenda"
        >
          <DownloadIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onExport} className="gap-2">
          <DownloadIcon className="size-4" aria-hidden="true" />
          Exportar .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Page identity and the period actually on screen */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Agenda
          </h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            {getPeriodLabel()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:hidden">
          {exportMenu}
          {canCreateEvent ? (
            <CreateEventDialog
              departments={departments ?? []}
              defaultDate={formatCalendarDate(currentDate, "yyyy-MM-dd", {
                timeZone,
              })}
              trigger={
                <Button
                  size="icon"
                  className="size-11 rounded-xl shadow-xs"
                  aria-label="Novo culto ou evento"
                >
                  <CalendarPlusIcon className="size-5" />
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {/* Navigation, view switcher and desktop actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div
          className="flex shrink-0 items-center gap-1 rounded-xl border bg-card p-1 shadow-2xs"
          role="group"
          aria-label="Navegação do período"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            aria-label="Período anterior"
            className="size-9 rounded-lg"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="h-9 rounded-lg px-2.5 text-xs font-semibold"
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label="Próximo período"
            className="size-9 rounded-lg"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {/* Mobile: one compact selector instead of five tabs */}
        <div className="sm:hidden">
          <NativeSelect
            aria-label="Visualização do calendário"
            value={viewMode}
            onChange={(event) =>
              onViewChange(event.target.value as CalendarViewMode)
            }
            className="min-w-32 [&_select]:h-11 [&_select]:text-sm"
          >
            <NativeSelectOption value="agenda">Agenda</NativeSelectOption>
            <NativeSelectOption value="month">Mês</NativeSelectOption>
            <NativeSelectOption value="week">Semana</NativeSelectOption>
            <NativeSelectOption value="day">Dia</NativeSelectOption>
            <NativeSelectOption value="year">Ano</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="hidden sm:block">
          <Tabs
            value={viewMode}
            onValueChange={(value) => onViewChange(value as CalendarViewMode)}
            className="w-auto shrink-0"
          >
            <TabsList
              className="h-9 rounded-xl bg-muted/80 p-1"
              aria-label="Visualização do calendário"
            >
              <TabsTrigger
                value="agenda"
                className="gap-1 px-2.5 py-1 text-xs"
              >
                <ListIcon className="size-3.5" aria-hidden="true" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1 px-2.5 py-1 text-xs">
                <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                Mês
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1 px-2.5 py-1 text-xs">
                <CalendarRangeIcon className="size-3.5" aria-hidden="true" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="day" className="gap-1 px-2.5 py-1 text-xs">
                <CalendarIcon className="size-3.5" aria-hidden="true" />
                Dia
              </TabsTrigger>
              <TabsTrigger value="year" className="gap-1 px-2.5 py-1 text-xs">
                Ano
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {exportMenu}
          {canCreateEvent ? (
            <CreateEventDialog
              departments={departments ?? []}
              defaultDate={formatCalendarDate(currentDate, "yyyy-MM-dd", {
                timeZone,
              })}
              trigger={
                <Button
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs sm:text-sm"
                >
                  <CalendarPlusIcon className="size-4" />
                  <span>Novo culto ou evento</span>
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {/* Filters: a single sheet on mobile, inline chips on desktop */}
      <div className="sm:hidden">
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-between gap-2 text-sm"
              aria-label={
                activeFilterCount > 0
                  ? `Filtrar agenda, ${activeFilterCount} filtros ativos`
                  : "Filtrar agenda"
              }
            >
              <span className="flex items-center gap-2">
                <FilterIcon className="size-4" aria-hidden="true" />
                Filtrar
              </span>
              <span className="flex items-center gap-2">
                {filterType !== "all" ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {filterOptions.find((option) => option.value === filterType)
                      ?.label ?? "Filtro ativo"}
                  </span>
                ) : null}
                {activeFilterCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 gap-4 p-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Departamento
              </Label>
              {departmentSelect ?? (
                <p className="text-xs text-muted-foreground">
                  Nenhum departamento disponível.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mostrar
              </Label>
              <div className="flex flex-col gap-1.5">
                {filterOptions.map((option) =>
                  renderFilterChip(
                    option,
                    "min-h-11 w-full justify-start rounded-lg px-3",
                  ),
                )}
              </div>
            </div>

            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onFilterChange("all");
                  onDepartmentChange?.("all");
                  setFiltersOpen(false);
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <div className="hidden flex-col gap-2 sm:flex">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {departmentSelect}
          {filterOptions.map((option) => renderFilterChip(option))}
        </div>
      </div>
    </div>
  );
}
