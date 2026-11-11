"use client";

import { useCallback, useMemo, useState } from "react";
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
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const preferences = initialPreferences;

  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Navigation Handlers
  const handlePrev = useCallback(() => {
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
  }, [viewMode]);

  const handleNext = useCallback(() => {
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
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  }, []);

  const handleSelectMonth = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("month");
  }, []);

  const handleSelectItem = useCallback((item: CalendarItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  // Department filtered items
  const departmentFilteredItems = useMemo(() => {
    if (selectedDepartmentId === "all") return initialItems;
    return initialItems.filter((item) => {
      if (item.type === "event") {
        return item.metadata?.departmentIds?.includes(selectedDepartmentId);
      }
      if (item.type === "assignment") {
        return (
          item.metadata?.departmentId === selectedDepartmentId ||
          item.metadata?.departmentIds?.includes(selectedDepartmentId)
        );
      }
      if (item.type === "birthday") {
        return item.metadata?.departmentIds?.includes(selectedDepartmentId);
      }
      if (item.type === "unavailability") {
        return true;
      }
      return true;
    });
  }, [initialItems, selectedDepartmentId]);

  // Items count
  const itemsCount = useMemo(() => {
    return {
      total: departmentFilteredItems.length,
      events: departmentFilteredItems.filter((i) => i.type === "event").length,
      assignments: departmentFilteredItems.filter((i) => i.type === "assignment")
        .length,
      unavailabilities: departmentFilteredItems.filter(
        (i) => i.type === "unavailability",
      ).length,
      birthdays: departmentFilteredItems.filter((i) => i.type === "birthday")
        .length,
    };
  }, [departmentFilteredItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterType === "events")
      return departmentFilteredItems.filter((i) => i.type === "event");
    if (filterType === "assignments")
      return departmentFilteredItems.filter((i) => i.type === "assignment");
    if (filterType === "unavailabilities")
      return departmentFilteredItems.filter((i) => i.type === "unavailability");
    if (filterType === "birthdays")
      return departmentFilteredItems.filter((i) => i.type === "birthday");

    // filterType === "all"
    // Quando o usuário possui escala em um culto/evento, agrupamos priorizando a escala
    // para não exibir dois cards (um de culto geral e outro de escala) para o mesmo evento.
    const assignmentEventIds = new Set(
      departmentFilteredItems
        .filter((i) => i.type === "assignment" && i.metadata?.eventId)
        .map((i) => i.metadata!.eventId!),
    );

    return departmentFilteredItems.filter((item) => {
      if (item.type === "event" && item.metadata?.eventId) {
        return !assignmentEventIds.has(item.metadata.eventId);
      }
      return true;
    });
  }, [departmentFilteredItems, filterType]);

  return (
    <div className="space-y-6">
      {/* Calendar Header with Navigation, Views & Filters */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filterType={filterType}
        selectedDepartmentId={selectedDepartmentId}
        preferences={preferences}
        onViewChange={setViewMode}
        onFilterChange={setFilterType}
        onDepartmentChange={setSelectedDepartmentId}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
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
