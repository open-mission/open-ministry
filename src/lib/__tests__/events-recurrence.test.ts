import { describe, expect, it } from "bun:test";

import {
  findNthWeekdayOfMonth,
  formatNthWeekdayLabel,
  generateOccurrences,
  getNthWeekdayInfo,
  recurrenceLabel,
  zonedDateTimeToUtc,
} from "@/lib/recurrence-utils";

describe("Monthly nth weekday recurrence calculations", () => {
  it("finds the correct day of month for nth weekday", () => {
    // November 2026 (Nov 1 is Sunday)
    expect(findNthWeekdayOfMonth(2026, 10, 0, 1)).toBe(1); // 1st Sunday
    expect(findNthWeekdayOfMonth(2026, 10, 0, 2)).toBe(8); // 2nd Sunday
    expect(findNthWeekdayOfMonth(2026, 10, 0, 3)).toBe(15); // 3rd Sunday
    expect(findNthWeekdayOfMonth(2026, 10, 0, 4)).toBe(22); // 4th Sunday
    expect(findNthWeekdayOfMonth(2026, 10, 0, 5)).toBe(29); // 5th Sunday
    expect(findNthWeekdayOfMonth(2026, 10, 0, -1)).toBe(29); // Last Sunday

    // December 2026 (Dec 1 is Tuesday)
    expect(findNthWeekdayOfMonth(2026, 11, 0, 1)).toBe(6); // 1st Sunday
    expect(findNthWeekdayOfMonth(2026, 11, 0, 2)).toBe(13); // 2nd Sunday
    expect(findNthWeekdayOfMonth(2026, 11, 0, -1)).toBe(27); // Last Sunday

    // November 2026 (Monday = 1)
    expect(findNthWeekdayOfMonth(2026, 10, 1, 1)).toBe(2); // 1st Monday
    expect(findNthWeekdayOfMonth(2026, 10, 1, 3)).toBe(16); // 3rd Monday

    // February 2027 (non-leap year, 28 days; Feb 1 is Monday)
    expect(findNthWeekdayOfMonth(2027, 1, 0, 2)).toBe(14); // 2nd Sunday
    expect(findNthWeekdayOfMonth(2027, 1, 0, 4)).toBe(28); // 4th Sunday
    expect(findNthWeekdayOfMonth(2027, 1, 0, -1)).toBe(28); // Last Sunday
    expect(findNthWeekdayOfMonth(2027, 1, 0, 5)).toBeNull(); // No 5th Sunday
  });

  it("extracts correct info from date string", () => {
    const nov8 = getNthWeekdayInfo("2026-11-08"); // 2nd Sunday
    expect(nov8.weekday).toBe(0);
    expect(nov8.nth).toBe(2);
    expect(nov8.isLast).toBe(false);
    expect(nov8.label).toBe("Todo 2º domingo do mês");

    const nov16 = getNthWeekdayInfo("2026-11-16"); // 3rd Monday
    expect(nov16.weekday).toBe(1);
    expect(nov16.nth).toBe(3);
    expect(nov16.isLast).toBe(false);
    expect(nov16.label).toBe("Toda 3ª segunda-feira do mês");

    const nov29 = getNthWeekdayInfo("2026-11-29"); // 5th and last Sunday
    expect(nov29.weekday).toBe(0);
    expect(nov29.nth).toBe(5);
    expect(nov29.isLast).toBe(true);
    expect(nov29.lastLabel).toBe("Todo último domingo do mês");
  });

  it("formats nth weekday labels with correct Portuguese gender", () => {
    // Domingo (masculino)
    expect(formatNthWeekdayLabel(1, 0)).toBe("Todo 1º domingo do mês");
    expect(formatNthWeekdayLabel(2, 0)).toBe("Todo 2º domingo do mês");
    expect(formatNthWeekdayLabel(3, 0)).toBe("Todo 3º domingo do mês");
    expect(formatNthWeekdayLabel(-1, 0)).toBe("Todo último domingo do mês");

    // Segunda-feira (feminino)
    expect(formatNthWeekdayLabel(1, 1)).toBe("Toda 1ª segunda-feira do mês");
    expect(formatNthWeekdayLabel(3, 1)).toBe("Toda 3ª segunda-feira do mês");
    expect(formatNthWeekdayLabel(-1, 1)).toBe("Toda última segunda-feira do mês");

    // Sábado (masculino)
    expect(formatNthWeekdayLabel(2, 6)).toBe("Todo 2º sábado do mês");
  });

  it("generates occurrences for 2nd Sunday of each month", () => {
    const startsAt = zonedDateTimeToUtc("2026-11-08", "19:00");
    const endsAt = zonedDateTimeToUtc("2026-11-08", "20:30");
    const recurrenceEndsAt = zonedDateTimeToUtc("2027-02-28", "23:59");

    const occurrences = generateOccurrences({
      startsAt,
      endsAt,
      recurrence: "monthly_nth_weekday",
      recurrenceInterval: 2,
      recurrenceEndsAt,
    });

    expect(occurrences).toHaveLength(4);

    // Each occurrence must be 90 minutes long (5400000 ms)
    for (const occ of occurrences) {
      expect(occ.endsAt.getTime() - occ.startsAt.getTime()).toBe(90 * 60 * 1000);
    }

    // In America/Sao_Paulo 19:00 UTC is 22:00 UTC (no DST in 2026)
    // Let's verify by converting via getNthWeekdayInfo
    const info0 = getNthWeekdayInfo(occurrences[0].startsAt);
    expect(info0.day).toBe(8);
    expect(info0.weekday).toBe(0);

    const info1 = getNthWeekdayInfo(occurrences[1].startsAt);
    expect(info1.day).toBe(13);
    expect(info1.weekday).toBe(0);

    const info2 = getNthWeekdayInfo(occurrences[2].startsAt);
    expect(info2.day).toBe(10);
    expect(info2.weekday).toBe(0);

    const info3 = getNthWeekdayInfo(occurrences[3].startsAt);
    expect(info3.day).toBe(14);
    expect(info3.weekday).toBe(0);
  });

  it("generates occurrences for 3rd Monday of each month", () => {
    const startsAt = zonedDateTimeToUtc("2026-11-16", "20:00");
    const endsAt = zonedDateTimeToUtc("2026-11-16", "21:30");
    const recurrenceEndsAt = zonedDateTimeToUtc("2027-01-31", "23:59");

    const occurrences = generateOccurrences({
      startsAt,
      endsAt,
      recurrence: "monthly_nth_weekday",
      recurrenceInterval: 3,
      recurrenceEndsAt,
    });

    expect(occurrences).toHaveLength(3);

    const info0 = getNthWeekdayInfo(occurrences[0].startsAt);
    expect(info0.day).toBe(16);
    expect(info0.weekday).toBe(1);

    const info1 = getNthWeekdayInfo(occurrences[1].startsAt);
    expect(info1.day).toBe(21);
    expect(info1.weekday).toBe(1);

    const info2 = getNthWeekdayInfo(occurrences[2].startsAt);
    expect(info2.day).toBe(18);
    expect(info2.weekday).toBe(1);
  });

  it("generates occurrences for last Sunday of each month", () => {
    const startsAt = zonedDateTimeToUtc("2026-11-29", "18:00");
    const endsAt = zonedDateTimeToUtc("2026-11-29", "19:30");
    const recurrenceEndsAt = zonedDateTimeToUtc("2027-01-31", "23:59");

    const occurrences = generateOccurrences({
      startsAt,
      endsAt,
      recurrence: "monthly_nth_weekday",
      recurrenceInterval: -1,
      recurrenceEndsAt,
    });

    expect(occurrences).toHaveLength(3);

    const info0 = getNthWeekdayInfo(occurrences[0].startsAt);
    expect(info0.day).toBe(29); // Last Sunday in Nov 2026
    expect(info0.isLast).toBe(true);

    const info1 = getNthWeekdayInfo(occurrences[1].startsAt);
    expect(info1.day).toBe(27); // Last Sunday in Dec 2026
    expect(info1.isLast).toBe(true);

    const info2 = getNthWeekdayInfo(occurrences[2].startsAt);
    expect(info2.day).toBe(31); // Last Sunday in Jan 2027
    expect(info2.isLast).toBe(true);
  });

  it("produces correct recurrenceLabel", () => {
    const sunday = zonedDateTimeToUtc("2026-11-08", "19:00");
    expect(recurrenceLabel("monthly_nth_weekday", 2, sunday)).toBe(
      "Todo 2º domingo do mês",
    );

    const monday = zonedDateTimeToUtc("2026-11-16", "20:00");
    expect(recurrenceLabel("monthly_nth_weekday", 3, monday)).toBe(
      "Toda 3ª segunda-feira do mês",
    );

    expect(recurrenceLabel("monthly_nth_weekday", -1, sunday)).toBe(
      "Todo último domingo do mês",
    );
  });
});
