"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";

import { CalendarHeader } from "@/components/calendar/calendar-header";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { CalendarAgendaView } from "@/components/calendar/views/calendar-agenda-view";
import { CalendarDayView } from "@/components/calendar/views/calendar-day-view";
import { CalendarMonthView } from "@/components/calendar/views/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar/views/calendar-week-view";
import { CalendarYearView } from "@/components/calendar/views/calendar-year-view";
import type {
  CalendarFilterType,
  CalendarItem,
  CalendarPreferences,
  CalendarViewMode,
} from "@/lib/calendar";

type FullCalendarProps = {
  initialItems: CalendarItem[];
  initialPreferences: CalendarPreferences;
  isAdmin?: boolean;
  departments?: { id: string; name: string }[];
};

export function FullCalendar({
  initialItems,
  initialPreferences,
  isAdmin,
  departments,
}: FullCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [filterType, setFilterType] = useState<CalendarFilterType>("all");
  const [preferences, setPreferences] =
    useState<CalendarPreferences>(initialPreferences);

  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Navigation Handlers
  function handlePrev() {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case "month":
          return subMonths(prev, 1);
        case "week":
          return subWeeks(prev, 1);
        case "day":
          return subDays(prev, 1);
        case "year":
          return subYears(prev, 1);
        case "agenda":
          return subMonths(prev, 1);
      }
    });
  }

  function handleNext() {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case "month":
          return addMonths(prev, 1);
        case "week":
          return addWeeks(prev, 1);
        case "day":
          return addDays(prev, 1);
        case "year":
          return addYears(prev, 1);
        case "agenda":
          return addMonths(prev, 1);
      }
    });
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleSelectDate(date: Date) {
    setCurrentDate(date);
    setViewMode("day");
  }

  function handleSelectMonth(date: Date) {
    setCurrentDate(date);
    setViewMode("month");
  }

  function handleSelectItem(item: CalendarItem) {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }

  // Items count
  const itemsCount = useMemo(() => {
    return {
      total: initialItems.length,
      events: initialItems.filter((i) => i.type === "event").length,
      assignments: initialItems.filter((i) => i.type === "assignment").length,
      unavailabilities: initialItems.filter((i) => i.type === "unavailability")
        .length,
    };
  }, [initialItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterType === "events")
      return initialItems.filter((i) => i.type === "event");
    if (filterType === "assignments")
      return initialItems.filter((i) => i.type === "assignment");
    if (filterType === "unavailabilities")
      return initialItems.filter((i) => i.type === "unavailability");

    // filterType === "all"
    // Quando o usuário possui escala em um culto/evento, agrupamos priorizando a escala
    // para não exibir dois cards (um de culto geral e outro de escala) para o mesmo evento.
    const assignmentEventIds = new Set(
      initialItems
        .filter((i) => i.type === "assignment" && i.metadata?.eventId)
        .map((i) => i.metadata!.eventId!),
    );

    return initialItems.filter((item) => {
      if (item.type === "event" && item.metadata?.eventId) {
        return !assignmentEventIds.has(item.metadata.eventId);
      }
      return true;
    });
  }, [initialItems, filterType]);

  return (
    <div className="space-y-6">
      {/* Calendar Header with Navigation, Views & Filters */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filterType={filterType}
        preferences={preferences}
        onViewChange={setViewMode}
        onFilterChange={setFilterType}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onPreferencesChange={setPreferences}
        itemsCount={itemsCount}
        isAdmin={isAdmin}
        departments={departments}
      />

      {/* View Content */}
      <div className="min-h-[500px]">
        {viewMode === "month" && (
          <CalendarMonthView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            onSelectDate={handleSelectDate}
            onSelectItem={handleSelectItem}
          />
        )}

        {viewMode === "week" && (
          <CalendarWeekView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            onSelectDate={handleSelectDate}
            onSelectItem={handleSelectItem}
          />
        )}

        {viewMode === "day" && (
          <CalendarDayView
            currentDate={currentDate}
            items={filteredItems}
            onSelectItem={handleSelectItem}
            onSwitchToMonth={() => setViewMode("month")}
          />
        )}

        {viewMode === "year" && (
          <CalendarYearView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            onSelectDate={handleSelectDate}
            onSelectMonth={handleSelectMonth}
          />
        )}

        {viewMode === "agenda" && (
          <CalendarAgendaView
            currentDate={currentDate}
            items={filteredItems}
            onSelectItem={handleSelectItem}
          />
        )}
      </div>

      {/* Item Detail Dialog */}
      <EventDetailDialog
        item={selectedItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
