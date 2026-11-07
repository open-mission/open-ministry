import type { AvailabilityPeriod } from "@/db/schema/people";

export type CalendarItemType = "event" | "assignment" | "unavailability";

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  allDay: boolean;
  color: "primary" | "emerald" | "amber" | "purple" | "blue" | "rose";
  location?: string | null;
  href?: string | null;
  metadata?: {
    eventId?: string;
    departmentName?: string;
    functionName?: string;
    eventKind?: string;
    reason?: string | null;
    periods?: AvailabilityPeriod[];
    isMyAssignment?: boolean;
  };
};

export type CalendarViewMode = "month" | "week" | "day" | "year" | "agenda";

export type CalendarFilterType = "all" | "events" | "assignments" | "unavailabilities";

export type CalendarPreferences = {
  weekStartsOn: 0 | 1; // 0 = Domingo, 1 = Segunda-feira
  timezone: string;
};

export const COMMON_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Horário de Brasília (São Paulo, Rio, DF) - UTC-3" },
  { value: "America/Manaus", label: "Horário da Amazônia (Manaus) - UTC-4" },
  { value: "America/Cuiaba", label: "Cuiabá / Campo Grande - UTC-4" },
  { value: "America/Belem", label: "Belém / Macapá - UTC-3" },
  { value: "America/Fortaleza", label: "Fortaleza / Salvador / Nordeste - UTC-3" },
  { value: "America/Porto_Velho", label: "Porto Velho - UTC-4" },
  { value: "America/Boa_Vista", label: "Boa Vista - UTC-4" },
  { value: "America/Rio_Branco", label: "Rio Branco / Acre - UTC-5" },
  { value: "America/Noronha", label: "Fernando de Noronha - UTC-2" },
  { value: "Europe/Lisbon", label: "Lisboa / Portugal - WET/WEST" },
  { value: "America/New_York", label: "Nova York / Flórida (Eastern Time) - UTC-5" },
];
