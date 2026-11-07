"use client";

import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDaysIcon,
  CalendarIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  ListIcon,
} from "lucide-react";

import { CalendarPreferencesDialog } from "@/components/calendar/calendar-preferences-dialog";
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
  preferences: CalendarPreferences;
  onViewChange: (view: CalendarViewMode) => void;
  onFilterChange: (filter: CalendarFilterType) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPreferencesChange: (preferences: CalendarPreferences) => void;
  itemsCount: {
    total: number;
    events: number;
    assignments: number;
    unavailabilities: number;
  };
};

export function CalendarHeader({
  currentDate,
  viewMode,
  filterType,
  preferences,
  onViewChange,
  onFilterChange,
  onPrev,
  onNext,
  onToday,
  onPreferencesChange,
  itemsCount,
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onPrev}
              title="Período anterior"
              className="size-7"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={onToday}
              className="h-7 px-2 text-xs font-medium"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onNext}
              title="Próximo período"
              className="size-7"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          <h2 className="font-heading text-lg sm:text-2xl font-bold capitalize tracking-tight text-foreground">
            {getTitle()}
          </h2>
        </div>

        {/* View Switcher & Settings */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <Tabs
            value={viewMode}
            onValueChange={(val) => onViewChange(val as CalendarViewMode)}
            className="w-auto"
          >
            <TabsList className="h-9 p-1 bg-muted/80">
              <TabsTrigger
                value="month"
                className="gap-1.5 px-2.5 py-1 text-xs"
              >
                <CalendarDaysIcon className="size-3.5" />
                Mês
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="gap-1.5 px-2.5 py-1 text-xs"
              >
                <CalendarRangeIcon className="size-3.5" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="day" className="gap-1.5 px-2.5 py-1 text-xs">
                <CalendarIcon className="size-3.5" />
                Dia
              </TabsTrigger>
              <TabsTrigger value="year" className="gap-1.5 px-2.5 py-1 text-xs">
                Ano
              </TabsTrigger>
              <TabsTrigger
                value="agenda"
                className="gap-1.5 px-2.5 py-1 text-xs"
              >
                <ListIcon className="size-3.5" />
                Agenda
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <CalendarPreferencesDialog
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground mr-1 text-[11px] font-medium uppercase tracking-wider">
          <FilterIcon className="size-3" />
          Filtrar:
        </span>

        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer border",
            filterType === "all"
              ? "bg-foreground text-background border-foreground shadow-2xs"
              : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
          )}
        >
          Todos ({itemsCount.total})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("events")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer border",
            filterType === "events"
              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
              : "bg-primary/5 text-primary border-primary/10 hover:bg-primary/10",
          )}
        >
          Cultos & Eventos ({itemsCount.events})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("assignments")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer border",
            filterType === "assignments"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15",
          )}
        >
          Minhas Escalas ({itemsCount.assignments})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("unavailabilities")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer border",
            filterType === "unavailabilities"
              ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15",
          )}
        >
          Indisponibilidades ({itemsCount.unavailabilities})
        </button>
      </div>
    </div>
  );
}
