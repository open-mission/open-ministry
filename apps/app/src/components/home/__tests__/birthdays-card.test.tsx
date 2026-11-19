import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  BirthdaysCard,
  birthdaysForCurrentMonth,
} from "@/components/home/birthdays-card";
import type { BirthdayEntry, CalendarDate } from "@/lib/birthdays";

const today: CalendarDate = { year: 2026, month: 11, day: 19 };

function entry(overrides: Partial<BirthdayEntry> = {}): BirthdayEntry {
  return {
    personId: "person-1",
    userId: null,
    name: "Maria Silva",
    image: null,
    phone: null,
    month: 11,
    day: 20,
    dateLabel: "20 de novembro",
    monthLabel: "Novembro",
    daysUntil: 1,
    isToday: false,
    isTomorrow: true,
    birthYear: null,
    turningAge: null,
    ...overrides,
  };
}

describe("birthdaysForCurrentMonth", () => {
  it("mantém apenas aniversariantes do mês atual, ordenados pelo dia", () => {
    const result = birthdaysForCurrentMonth(
      [
        entry({ personId: "late", name: "Ana", day: 25 }),
        entry({
          personId: "other-month",
          name: "João",
          month: 10,
          day: 2,
        }),
        entry({ personId: "early", name: "Bia", day: 3 }),
      ],
      today,
    );

    expect(result.map((item) => item.personId)).toEqual(["early", "late"]);
  });

  it("retorna lista vazia quando ninguém faz aniversário no mês", () => {
    expect(
      birthdaysForCurrentMonth(
        [entry({ month: 10 }), entry({ month: 12 })],
        today,
      ),
    ).toEqual([]);
  });
});

describe("BirthdaysCard", () => {
  it("não renderiza a seção quando não há aniversariantes no mês", () => {
    const markup = renderToStaticMarkup(
      createElement(BirthdaysCard, {
        entries: [entry({ month: 10 }), entry({ month: 12 })],
        today,
      }),
    );

    expect(markup).toBe("");
  });

  it("renderiza a seção e os dados quando há aniversariantes no mês", () => {
    const markup = renderToStaticMarkup(
      createElement(BirthdaysCard, {
        entries: [
          entry({ personId: "leader", name: "Maria Silva", day: 20 }),
        ],
        today,
        leaderIds: ["leader"],
      }),
    );

    expect(markup).toContain("Aniversariantes do mês");
    expect(markup).toContain("Maria Silva");
    expect(markup).toContain("Líder");
    expect(markup).toContain("Ver todos");
  });
});
