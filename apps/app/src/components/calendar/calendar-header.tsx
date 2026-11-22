"use client";

import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Music2Icon,
} from "lucide-react";

import { CalendarActions } from "@/components/calendar/calendar-actions";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
  onViewChange: (view: CalendarViewMode) => void;
  onFilterChange: (filter: CalendarFilterType) => void;
  onDepartmentChange: (departmentId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onExport: () => void;
};

const DESKTOP_VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "agenda", label: "Agenda" },
  { value: "day", label: "Dia" },
  { value: "year", label: "Ano" },
];

// Mobile prioritizes chronological Agenda first, followed by Week, Month, Day, Year.
const MOBILE_VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "agenda", label: "Agenda" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "day", label: "Dia" },
  { value: "year", label: "Ano" },
];

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
  onViewChange,
  onFilterChange,
  onDepartmentChange,
  onPrev,
  onNext,
  onToday,
  onExport,
}: CalendarHeaderProps) {
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

  const filterChips: {
    id: CalendarFilterType;
    label: string;
    count: number;
  }[] = [
    { id: "all", label: "Todos", count: totalCount },
    { id: "assignments", label: "Minhas escalas", count: assignmentsCount },
    { id: "events", label: "Cultos e eventos", count: eventsCount },
    {
      id: "unavailabilities",
      label: canViewTeamAvailability ? "Indisponibilidades" : "Indisp.",
      count: unavailabilitiesCount,
    },
    { id: "birthdays", label: "Aniversários", count: birthdaysCount },
  ];

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
    <header className="flex flex-col gap-3">
      {/* Linha 1 Mobile + Desktop: Título do período + Ações principais */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {getPeriodLabel()}
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCount === 0
                ? "Sem compromissos neste período"
                : `${totalCount} ${totalCount === 1 ? "compromisso" : "compromissos"}`}
            </p>
          </div>

          <div className="hidden sm:block">{desktopNavGroup}</div>

          {weekAssignmentsCount > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange("assignments")}
              className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-secondary px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-secondary/80 md:inline-flex"
            >
              <Music2Icon className="size-3.5" aria-hidden="true" />
              <span>
                Sua semana: {weekAssignmentsCount}{" "}
                {weekAssignmentsCount === 1 ? "escala" : "escalas"}
              </span>
            </button>
          ) : null}
        </div>

        {/* Mobile: Hoje + Novo + Exportar */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            onClick={onToday}
            className="h-11 rounded-xl bg-card px-3 text-xs font-semibold"
          >
            Hoje
          </Button>
          <CalendarActions
            departments={departments}
            defaultDate={defaultDateInput}
            canCreateEvent={canCreateEvent}
            canCreateRehearsal={canCreateRehearsal}
            onExport={onExport}
            variant="mobile"
          />
        </div>

        {/* Desktop: Ações (+ Novo & .ics/Sync) */}
        <div className="hidden items-center gap-2 sm:flex">
          <CalendarActions
            departments={departments}
            defaultDate={defaultDateInput}
            canCreateEvent={canCreateEvent}
            canCreateRehearsal={canCreateRehearsal}
            onExport={onExport}
            variant="desktop"
          />
        </div>
      </div>

      {/* Mobile: Navegador compacto + 5 visões (Agenda primeiro) + filtros inline */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <ButtonGroup aria-label="Navegar período" className="w-full justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrev}
              aria-label="Período anterior"
              className="size-11 rounded-xl bg-card"
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </Button>
            <Tabs
              value={viewMode}
              onValueChange={(value) => onViewChange(value as CalendarViewMode)}
              className="min-w-0 flex-1"
            >
              <TabsList
                aria-label="Visualizações da agenda"
                className="grid h-11 w-full grid-cols-5 rounded-xl bg-muted/70 p-1"
              >
                {MOBILE_VIEW_OPTIONS.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    className="h-9 rounded-lg px-1 text-[11px] font-medium data-[state=active]:font-semibold"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              aria-label="Próximo período"
              className="size-11 rounded-xl bg-card"
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {filterChips.map((chip) => {
            const isActive = filterType === chip.id;
            const isEmpty = chip.id !== "all" && chip.count === 0;
            return (
              <button
                key={chip.id}
                type="button"
                disabled={isEmpty}
                aria-pressed={isActive}
                onClick={() => onFilterChange(chip.id)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary/35 bg-secondary font-semibold text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted/60",
                  isEmpty && "cursor-not-allowed opacity-45",
                )}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {departments.length > 0 ? (
          <NativeSelect
            aria-label="Filtrar por departamento"
            value={selectedDepartmentId}
            onChange={(event) => onDepartmentChange(event.target.value)}
            className="h-11 w-full rounded-xl bg-card text-xs font-medium"
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
        ) : null}
      </div>

      {/* Linha 2 Desktop: Departamento + Filtros tonais calmos + 5 Visões (Mês padrão) */}
      <div className="hidden flex-wrap items-center justify-between gap-2.5 sm:flex">
        <div className="flex flex-wrap items-center gap-2">
          {departments.length > 0 ? (
            <NativeSelect
              aria-label="Filtrar por departamento"
              value={selectedDepartmentId}
              onChange={(event) => onDepartmentChange(event.target.value)}
              className="h-9 min-w-[180px] rounded-xl bg-card text-xs font-medium"
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
          ) : null}

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filtros por tipo"
          >
            {filterChips.map((chip) => {
              const isActive = filterType === chip.id;
              const isEmpty = chip.id !== "all" && chip.count === 0;
              return (
                <button
                  key={chip.id}
                  type="button"
                  disabled={isEmpty}
                  aria-pressed={isActive}
                  onClick={() => onFilterChange(chip.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary/35 bg-secondary font-semibold text-primary shadow-2xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    isEmpty && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span>{chip.label}</span>
                  <span className="font-mono text-[11px] tabular-nums opacity-80">
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(value) => onViewChange(value as CalendarViewMode)}
        >
          <TabsList
            aria-label="Visualizações da agenda"
            className="h-9 rounded-xl bg-muted/70 p-1"
          >
            {DESKTOP_VIEW_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="h-7 rounded-lg px-3 text-xs font-medium data-[state=active]:font-semibold"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
