"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatDateToYYYYMMDD, getPeriodFromDate } from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { requirePermission } from "@/lib/permissions/service";
import type { AvailabilityPeriod } from "@/db/schema";

export async function checkPersonAvailabilityForEventAction(
  personId: string,
  eventStartsAt: Date,
): Promise<{
  isAvailable: boolean;
  isBlocked: boolean;
  isInformed: boolean;
  blockedReason?: string | null;
  dayOfWeek: number;
  period: AvailabilityPeriod;
  notes?: string | null;
}> {
  const context = await requireOrganizationContext();
  await requirePermission("schedules", "read");

  const dateStr = formatDateToYYYYMMDD(eventStartsAt);
  const dayOfWeek = eventStartsAt.getDay();
  const period = getPeriodFromDate(eventStartsAt);

  const person = await db.query.person.findFirst({
    where: and(
      eq(schema.person.id, personId),
      eq(schema.person.organizationId, context.organization.id),
    ),
  });

  if (!person) {
    return {
      isAvailable: false,
      isBlocked: false,
      isInformed: false,
      dayOfWeek,
      period,
    };
  }

  const [blockedDate, weekly] = await Promise.all([
    db.query.personUnavailability.findFirst({
      where: and(
        eq(schema.personUnavailability.organizationId, context.organization.id),
        eq(schema.personUnavailability.personId, personId),
        eq(schema.personUnavailability.date, dateStr),
      ),
    }),
    db.query.personAvailability.findFirst({
      where: and(
        eq(schema.personAvailability.organizationId, context.organization.id),
        eq(schema.personAvailability.personId, personId),
        eq(schema.personAvailability.dayOfWeek, dayOfWeek),
      ),
    }),
  ]);

  const isInformed = Boolean(weekly);

  if (blockedDate) {
    const periods = (blockedDate.periods as AvailabilityPeriod[]) || [];
    const isBlocked = blockedDate.allDay || periods.includes(period);
    if (isBlocked) {
      return {
        isAvailable: false,
        isBlocked: true,
        isInformed,
        blockedReason:
          blockedDate.reason || "Indisponibilidade pontual registrada para esta data",
        dayOfWeek,
        period,
      };
    }
  }

  if (!weekly) {
    return {
      isAvailable: false,
      isBlocked: false,
      isInformed: false,
      dayOfWeek,
      period,
    };
  }

  const weeklyPeriods = (weekly.periods as AvailabilityPeriod[]) || [];
  const isAvailable = weeklyPeriods.includes(period);

  return {
    isAvailable,
    isBlocked: false,
    isInformed,
    dayOfWeek,
    period,
    notes: weekly.notes,
  };
}

export async function getEventUnavailablePeopleAction(
  eventId: string,
  startsAt?: Date,
): Promise<Record<string, { isBlocked: boolean; reason?: string | null }>> {
  const context = await requireOrganizationContext();
  if (!context) return {};
  await requirePermission("schedules", "read");

  let eventStartsAt = startsAt;

  if (!eventStartsAt) {
    const event = await db.query.event.findFirst({
      where: and(
        eq(schema.event.id, eventId),
        eq(schema.event.organizationId, context.organization.id),
      ),
    });

    if (!event) return {};
    eventStartsAt = event.startsAt;
  }

  const dateStr = formatDateToYYYYMMDD(eventStartsAt);
  const period = getPeriodFromDate(eventStartsAt);

  const blockedRows = await db.query.personUnavailability.findMany({
    where: and(
      eq(schema.personUnavailability.organizationId, context.organization.id),
      eq(schema.personUnavailability.date, dateStr),
    ),
  });

  const result: Record<string, { isBlocked: boolean; reason?: string | null }> = {};

  for (const row of blockedRows) {
    const periods = (row.periods as AvailabilityPeriod[]) || [];
    if (row.allDay || periods.includes(period)) {
      result[row.personId] = {
        isBlocked: true,
        reason: row.reason || "Indisponível nesta data",
      };
    }
  }

  return result;
}
