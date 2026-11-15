import { describe, expect, it } from "bun:test";

import {
  buildBirthdayEntries,
  getTodayInSaoPaulo,
  type CalendarDate,
} from "@/lib/birthdays";

const today: CalendarDate = { year: 2026, month: 11, day: 15 };

function makePerson(
  overrides: Partial<{
    id: string;
    name: string;
    email: string | null;
    image: string | null;
    birthday: string | null;
    userId: string | null;
    phone: string | null;
  }> = {},
) {
  return {
    id: "person-1",
    name: "Ana Souza",
    email: "ana@example.com",
    image: null,
    birthday: "1990-11-15",
    userId: null,
    phone: null,
    ...overrides,
  };
}

describe("buildBirthdayEntries", () => {
  it("includes the person phone in the birthday entry", () => {
    const [entry] = buildBirthdayEntries(
      [makePerson({ phone: "+55 (11) 99999-8888" })],
      { includeAge: false, today },
    );

    expect(entry).toMatchObject({
      personId: "person-1",
      phone: "+55 (11) 99999-8888",
    });
  });

  it("keeps phone null when the person has no phone", () => {
    const [entry] = buildBirthdayEntries([makePerson()], {
      includeAge: false,
      today,
    });

    expect(entry.phone).toBeNull();
  });

  it("calculates today, tomorrow and upcoming birthdays across the year", () => {
    const entries = buildBirthdayEntries(
      [
        makePerson({ id: "today", name: "Ana", birthday: "1990-11-15" }),
        makePerson({ id: "tomorrow", name: "Bia", birthday: "1992-11-16" }),
        makePerson({ id: "new-year", name: "Caio", birthday: "1988-01-02" }),
        makePerson({ id: "later", name: "Duda", birthday: "1995-11-20" }),
      ],
      { includeAge: true, today },
    );

    expect(entries.map((entry) => entry.personId)).toEqual([
      "today",
      "tomorrow",
      "later",
      "new-year",
    ]);
    expect(entries[0]).toMatchObject({
      daysUntil: 0,
      isToday: true,
      isTomorrow: false,
      turningAge: 36,
    });
    expect(entries[1]).toMatchObject({
      daysUntil: 1,
      isToday: false,
      isTomorrow: true,
    });
    expect(entries[2]).toMatchObject({ daysUntil: 5 });
    expect(entries[3]).toMatchObject({
      daysUntil: 48,
      month: 1,
      day: 2,
      turningAge: 39,
    });
  });

  it("clamps February 29 birthdays to the last day of February", () => {
    const [entry] = buildBirthdayEntries(
      [makePerson({ birthday: "2000-02-29" })],
      {
        includeAge: false,
        today: { year: 2027, month: 2, day: 27 },
      },
    );

    expect(entry).toMatchObject({
      month: 2,
      day: 29,
      daysUntil: 1,
      isTomorrow: true,
    });
  });

  it("resolves the current date in the São Paulo time zone", () => {
    const result = getTodayInSaoPaulo(new Date("2026-11-16T01:30:00.000Z"));

    expect(result).toEqual({ year: 2026, month: 11, day: 15 });
  });
});
