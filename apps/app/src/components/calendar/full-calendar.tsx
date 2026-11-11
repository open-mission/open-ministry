"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
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
import { toast } from "sonner";

import { CalendarHeader } from "@/components/calendar/calendar-header";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { CalendarAgendaView } from "@/components/calendar/views/calendar-agenda-view";
import { CalendarDayView } from "@/components/calendar/views/calendar-day-view";
import { CalendarMonthView } from "@/components/calendar/views/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar/views/calendar-week-view";
import { CalendarYearView } from "@/components/calendar/views/calendar-year-view";
import {
  AGENDA_WINDOW_DAYS,
  buildCalendarIcs,
  dedupeCalendarItems,
  getCalendarRange,
  isCalendarItemInRange,
  type CalendarFilterType,
  type CalendarItem,
  type CalendarPreferences,
  type CalendarViewMode,
} from "@/lib/calendar";

type FullCalendarProps = {
  initialItems: CalendarItem[];
  initialPreferences: CalendarPreferences;
  canCreateEvent?: boolean;
  canViewTeamAvailability?: boolean;
  departments?: { id: string; name: string }[];
};

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeToMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

export function FullCalendar({
  initialItems,
  initialPreferences,
  canCreateEvent,
  canViewTeamAvailability,
  departments,
}: FullCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [chosenView, setChosenView] = useState<CalendarViewMode | null>(null);
  const [filterType, setFilterType] = useState<CalendarFilterType>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const preferences = initialPreferences;

  // The member opens the app on a phone on Sunday; start where the answer is,
  // not in a seven-column grid squeezed into 375px. The chosen view always wins.
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );
  const viewMode = chosenView ?? (isMobile ? "agenda" : "month");

  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewChange = useCallback((view: CalendarViewMode) => {
    setChosenView(view);
  }, []);

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
          return subDays(prev, AGENDA_WINDOW_DAYS);
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
          return addDays(prev, AGENDA_WINDOW_DAYS);
      }
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setChosenView("day");
    setCurrentDate(date);
  }, []);

  const handleSelectMonth = useCallback((date: Date) => {
    setChosenView("month");
    setCurrentDate(date);
  }, []);

  const handleSelectItem = useCallback((item: CalendarItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  // Only the range the view actually renders. Everything below — counts,
  // filters, empty states — reads from it.
  const visibleRange = useMemo(
    () => getCalendarRange(viewMode, currentDate, preferences.weekStartsOn),
    [currentDate, preferences.weekStartsOn, viewMode],
  );

  const visibleItems = useMemo(
    () =>
      initialItems.filter((item) =>
        isCalendarItemInRange(item, visibleRange, preferences.timezone),
      ),
    [initialItems, preferences.timezone, visibleRange],
  );

  // Department filtered items
  const departmentFilteredItems = useMemo(() => {
    if (selectedDepartmentId === "all") return visibleItems;
    return visibleItems.filter((item) => {
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
        return (
          item.metadata?.departmentIds?.includes(selectedDepartmentId) ?? false
        );
      }
      return true;
    });
  }, [visibleItems, selectedDepartmentId]);

  // Items count for the visible range. "Todos" mirrors what is rendered
  // (an assignment replaces its event card), while each type keeps its own
  // count so the chip matches the filtered result.
  const itemsCount = useMemo(() => {
    return {
      total: dedupeCalendarItems(departmentFilteredItems).length,
      events: departmentFilteredItems.filter((i) => i.type === "event").length,
      assignments: departmentFilteredItems.filter(
        (i) => i.type === "assignment",
      ).length,
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

    return dedupeCalendarItems(departmentFilteredItems);
  }, [departmentFilteredItems, filterType]);

  const handleExport = useCallback(() => {
    if (filteredItems.length === 0) {
      toast.info("Não há compromissos para exportar neste período.");
      return;
    }

    const ics = buildCalendarIcs(filteredItems, {
      timeZone: preferences.timezone,
      calendarName: "Agenda OpenMinistry",
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agenda-openministry.ics";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Agenda exportada para o seu calendário.");
  }, [filteredItems, preferences.timezone]);

  return (
    <div className="space-y-6">
      {/* Calendar Header with Navigation, Views & Filters */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filterType={filterType}
        selectedDepartmentId={selectedDepartmentId}
        preferences={preferences}
        visibleRange={visibleRange}
        onViewChange={handleViewChange}
        onFilterChange={setFilterType}
        onDepartmentChange={setSelectedDepartmentId}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onExport={handleExport}
        itemsCount={itemsCount}
        canCreateEvent={canCreateEvent}
        canViewTeamAvailability={canViewTeamAvailability}
        departments={departments}
      />

      {/* View Content */}
      <div className="min-h-[500px]">
        {viewMode === "month" && (
          <CalendarMonthView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            timeZone={preferences.timezone}
            onSelectDate={handleSelectDate}
            onSelectItem={handleSelectItem}
          />
        )}

        {viewMode === "week" && (
          <CalendarWeekView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            timeZone={preferences.timezone}
            onSelectDate={handleSelectDate}
            onSelectItem={handleSelectItem}
          />
        )}

        {viewMode === "day" && (
          <CalendarDayView
            currentDate={currentDate}
            items={filteredItems}
            timeZone={preferences.timezone}
            onSelectItem={handleSelectItem}
            onSwitchToMonth={() => handleViewChange("month")}
          />
        )}

        {viewMode === "year" && (
          <CalendarYearView
            currentDate={currentDate}
            items={filteredItems}
            weekStartsOn={preferences.weekStartsOn}
            timeZone={preferences.timezone}
            onSelectDate={handleSelectDate}
            onSelectMonth={handleSelectMonth}
          />
        )}

        {viewMode === "agenda" && (
          <CalendarAgendaView
            currentDate={currentDate}
            items={filteredItems}
            timeZone={preferences.timezone}
            onSelectItem={handleSelectItem}
            onToday={handleToday}
          />
        )}
      </div>

      {/* Item Detail Dialog */}
      <EventDetailDialog
        item={selectedItem}
        open={isDetailOpen}
        timeZone={preferences.timezone}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
