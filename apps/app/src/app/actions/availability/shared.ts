import type { AvailabilityPeriod } from "@/db/schema";
import type { PersonUnavailabilityItem } from "@/lib/availability";

const VALID_PERIODS: AvailabilityPeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

/** Keeps known periods, removes duplicates and restores a stable order. */
export function normalizePeriods(value: unknown): AvailabilityPeriod[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const unique = new Set<AvailabilityPeriod>();
  for (const period of value) {
    if (!VALID_PERIODS.includes(period as AvailabilityPeriod)) return null;
    unique.add(period as AvailabilityPeriod);
  }

  return VALID_PERIODS.filter((period) => unique.has(period));
}

export function toUnavailabilityItem(row: {
  id: string;
  organizationId: string;
  personId: string;
  date: string;
  reason: string | null;
  allDay: boolean;
  periods: AvailabilityPeriod[];
  createdAt: Date;
  updatedAt: Date;
}): PersonUnavailabilityItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    personId: row.personId,
    date: row.date,
    reason: row.reason,
    allDay: row.allDay,
    periods: row.periods,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
