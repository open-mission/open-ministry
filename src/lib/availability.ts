import type { AvailabilityPeriod } from "@/db/schema/people";

export type DayAvailability = {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  periods: AvailabilityPeriod[];
  notes?: string | null;
};

export type MyAvailabilityResult = {
  personId: string;
  days: DayAvailability[];
  notes?: string | null;
};

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
