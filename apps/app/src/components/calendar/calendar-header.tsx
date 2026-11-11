"use client";

import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
} from "lucide-react";

import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  CalendarFilterType,
  CalendarPreferences,
  CalendarViewMode,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarHeaderProps = {
  currentDate: Date;
  viewMode: CalendarViewMode;
  filterType: CalendarFilterType;
  selectedDepartmentId?: string;
  preferences: CalendarPreferences;
  onViewChange: (view: CalendarViewMode) => void;
  onFilterChange: (filter: CalendarFilterType) => void;
  onDepartmentChange?: (departmentId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  itemsCount: {
    total: number;
    events: number;
    assignments: number;
    unavailabilities: number;
    birthdays?: number;
  };
  isAdmin?: boolean;
  departments?: { id: string; name: string }[];
};

export function CalendarHeader({
  currentDate,
  viewMode,
  filterType,
  selectedDepartmentId = "all",
  preferences,
  onViewChange,
  onFilterChange,
  onDepartmentChange,
  onPrev,
  onNext,
  onToday,
  itemsCount,
  isAdmin,
  departments,
}: CalendarHeaderProps) {
  function getTitle() {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case "week": {
        const start = startOfWeek(currentDate, {
          weekStartsOn: preferences.weekStartsOn,
        });
        const end = endOfWeek(currentDate, {
          weekStartsOn: preferences.weekStartsOn,
        });
        return `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(
          end,
          "d 'de' MMM 'de' yyyy",
          { locale: ptBR },
        )}`;
      }
      case "day":
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", {
          locale: ptBR,
        });
      case "year":
        return format(currentDate, "yyyy");
      case "agenda":
        return "Agenda Geral";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Title & Navigation + View Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Page Title & Mobile Full-Width Button */}
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl font-semibold capitalize tracking-tight text-foreground sm:text-4xl">
            {getTitle()}
          </h1>

          {isAdmin ? (
            <div className="sm:hidden w-full">
              <CreateEventDialog
                departments={departments ?? []}
                defaultDate={format(currentDate, "yyyy-MM-dd")}
                trigger={
                  <Button
                    size="lg"
                    className="w-full h-10 gap-2 rounded-xl text-sm font-semibold shadow-xs"
                  >
                    <CalendarPlusIcon className="size-4" />
                    <span>Novo culto ou evento</span>
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>

        {/* View Switcher, Navigation Controls & Desktop Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 lg:justify-end">
          {/* Navigation Controls: Hoje e Setas */}
          <div className="flex shrink-0 items-center gap-1 rounded-xl border bg-card p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onPrev}
              title="Período anterior"
              className="size-7 rounded-lg"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={onToday}
              className="h-7 rounded-lg px-2 text-xs font-semibold"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onNext}
              title="Próximo período"
              className="size-7 rounded-lg"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          <div className="flex items-center overflow-x-auto pb-1 scrollbar-none lg:pb-0">
            <Tabs
              value={viewMode}
              onValueChange={(val) => onViewChange(val as CalendarViewMode)}
              className="w-auto shrink-0"
            >
              <TabsList className="h-9 p-1 bg-muted/80 rounded-xl">
                <TabsTrigger
                  value="month"
                  className="gap-1 px-2.5 py-1 text-xs"
                >
                  <CalendarDaysIcon className="hidden sm:inline size-3.5" />
                  Mês
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="gap-1 px-2.5 py-1 text-xs"
                >
                  <CalendarRangeIcon className="hidden sm:inline size-3.5" />
                  Semana
                </TabsTrigger>
                <TabsTrigger value="day" className="gap-1 px-2.5 py-1 text-xs">
                  <CalendarIcon className="hidden sm:inline size-3.5" />
                  Dia
                </TabsTrigger>
                <TabsTrigger value="year" className="gap-1 px-2.5 py-1 text-xs">
                  Ano
                </TabsTrigger>
                <TabsTrigger
                  value="agenda"
                  className="order-first gap-1 px-2.5 py-1 text-xs md:order-none"
                >
                  <ListIcon className="hidden sm:inline size-3.5" />
                  Agenda
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isAdmin ? (
            <div className="hidden sm:block">
              <CreateEventDialog
                departments={departments ?? []}
                defaultDate={format(currentDate, "yyyy-MM-dd")}
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
            </div>
          ) : null}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 text-xs scrollbar-none sm:mx-0 sm:px-0">
          {departments && departments.length > 0 && onDepartmentChange ? (
            <div className="shrink-0 flex items-center mr-1">
              <select
                aria-label="Filtrar por departamento"
                value={selectedDepartmentId}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="h-7.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="all">Todos os departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              filterType === "all"
                ? "bg-foreground text-background border-foreground shadow-2xs font-semibold"
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
            )}
          >
            Todos ({itemsCount.total})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("events")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              filterType === "events"
                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                : "bg-primary/5 text-primary border-primary/10 hover:bg-primary/10",
            )}
          >
            Cultos & Eventos ({itemsCount.events})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("assignments")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              filterType === "assignments"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold dark:bg-emerald-500"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15",
            )}
          >
            Minhas Escalas ({itemsCount.assignments})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("unavailabilities")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              filterType === "unavailabilities"
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold dark:bg-amber-500"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15",
            )}
          >
            Indisponibilidades ({itemsCount.unavailabilities})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("birthdays")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              filterType === "birthdays"
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs font-semibold dark:bg-rose-500"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/15",
            )}
          >
            <CakeIcon className="size-3 mr-1 inline-block" />
            Aniversários ({itemsCount.birthdays ?? 0})
          </button>
        </div>
      </div>
    </div>
  );
}
