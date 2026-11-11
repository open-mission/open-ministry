import type { AvailabilityPeriod } from "@/db/schema/people";

export type DayAvailability = {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  periods: AvailabilityPeriod[];
  notes?: string | null;
  /** Whether the person has already answered for this weekday. */
  informed: boolean;
  updatedAt?: Date | null;
};

export type MyAvailabilityResult = {
  personId: string;
  days: DayAvailability[];
  notes?: string | null;
  /** False until the person saves their weekly availability for the first time. */
  hasSaved: boolean;
  updatedAt: Date | null;
};

export type PersonUnavailabilityItem = {
  id: string;
  organizationId: string;
  personId: string;
  date: string; // Format "YYYY-MM-DD"
  reason: string | null;
  allDay: boolean;
  periods: AvailabilityPeriod[];
  createdAt: Date;
  updatedAt: Date;
};

export type SaveMyAvailabilityResult =
  | { ok: true; updatedAt: Date }
  | { ok: false; error: string };

export type SaveUnavailabilityResult =
  | { ok: true; item: PersonUnavailabilityItem; updated: boolean }
  | { ok: false; error: string };

export type DeleteUnavailabilityResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export const DAYS_OF_WEEK = [
  { index: 0, label: "Domingo", shortLabel: "Dom" },
  { index: 1, label: "Segunda-feira", shortLabel: "Seg" },
  { index: 2, label: "Terça-feira", shortLabel: "Ter" },
  { index: 3, label: "Quarta-feira", shortLabel: "Qua" },
  { index: 4, label: "Quinta-feira", shortLabel: "Qui" },
  { index: 5, label: "Sexta-feira", shortLabel: "Sex" },
  { index: 6, label: "Sábado", shortLabel: "Sáb" },
];

export function getPeriodFromDate(date: Date): AvailabilityPeriod {
  const hours = date.getHours();
  if (hours < 12) return "morning";
  if (hours < 18) return "afternoon";
  return "evening";
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatYYYYMMDDToDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

