import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * UX and business rules for the Escalas & Cronograma module:
 * plan template export, schedule progress/coverage rules and the time
 * formatting shared by the event detail, share page and PDF.
 */

mock.module("@/db", () => ({ db: {} }));
mock.module("@/lib/cache", () => ({
  remember: async (
    _key: string,
    _ttl: number,
    fetcher: () => Promise<unknown>,
  ) => fetcher(),
}));

mock.module("@/app/actions/events", () => ({
  applyPlanTemplateAction: async () => ({ ok: true }),
  clearEventPlanAction: async () => ({ ok: true }),
  deletePlanTemplateAction: async () => ({ ok: true }),
  importPlanItemsAction: async () => ({ ok: true }),
  listPlanTemplatesAction: async () => ({ ok: true, templates: [] }),
  savePlanAsTemplateAction: async () => ({ ok: true }),
}));

const toastCalls = {
  success: [] as string[],
  error: [] as string[],
  info: [] as string[],
};

mock.module("sonner", () => ({
  toast: {
    success: (message: string) => toastCalls.success.push(message),
    error: (message: string) => toastCalls.error.push(message),
    info: (message: string) => toastCalls.info.push(message),
  },
}));

const { exportPlanAsJson } = await import(
  "@/features/events/components/plan-template-dialogs"
);
const {
  computeDurationMinutes,
  computeEndTime,
  computePlanItemTimes,
  formatDurationSeconds,
  parseDurationToSeconds,
} = await import("@/lib/plan-utils");
const {
  coverageCounts,
  coverageStatus,
  filterEvents,
  formatEventTime,
  formatEventTimeRange,
  isScaleComplete,
  needsAttention,
  parseCoverageFilter,
  scheduleProgress,
} = await import("@/lib/events");

type AnchorStub = {
  attributes: Record<string, string>;
  clicked: boolean;
  removed: boolean;
  setAttribute: (name: string, value: string) => void;
  click: () => void;
  remove: () => void;
};

const anchors: AnchorStub[] = [];

beforeEach(() => {
  anchors.length = 0;
  toastCalls.success.length = 0;
  toastCalls.error.length = 0;
  toastCalls.info.length = 0;

  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => {
      const anchor: AnchorStub = {
        attributes: {},
        clicked: false,
        removed: false,
        setAttribute(name, value) {
          anchor.attributes[name] = value;
        },
        click() {
          anchor.clicked = true;
        },
        remove() {
          anchor.removed = true;
        },
      };
      anchors.push(anchor);
      return anchor;
    },
    body: { appendChild: () => {} },
  };
});

afterEach(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
});

type PlanItemFixture = Parameters<typeof exportPlanAsJson>[1][number];

function makePlanItem(
  overrides: Partial<PlanItemFixture> = {},
): PlanItemFixture {
  const startsAt = new Date("2026-11-15T22:00:00Z");
  return {
    id: "item-1",
    eventId: "event-1",
    sectionId: null,
    type: "item",
    title: "Abertura",
    description: null,
    durationSeconds: 300,
    order: 0,
    personId: null,
    customResponsible: null,
    calculatedStartTime: startsAt,
    calculatedEndTime: new Date("2026-11-15T22:05:00Z"),
    timeLabel: "19:00",
    durationLabel: "5:00",
    ...overrides,
  };
}

describe("exportPlanAsJson", () => {
  it("exports a versioned payload with ordered items and a slugged file name", () => {
    exportPlanAsJson("Culto de Domingo — Noite", [
      makePlanItem({ type: "header", title: "Louvor", durationSeconds: 0 }),
      makePlanItem({
        id: "item-2",
        title: "Palavra",
        description: "Mensagem da noite",
        durationSeconds: 1800,
        customResponsible: "Pastor João",
      }),
      makePlanItem({
        id: "item-3",
        title: "Encerramento",
        person: {
          id: "person-1",
          name: "Maria",
          avatarUrl: null,
        },
      }),
    ]);

    expect(toastCalls.success).toEqual([
      "Cronograma exportado como arquivo JSON!",
    ]);
    expect(anchors).toHaveLength(1);

    const anchor = anchors[0]!;
    expect(anchor.clicked).toBe(true);
    expect(anchor.removed).toBe(true);
    expect(anchor.attributes.download).toContain("cronograma-culto-de-domingo-noite-");
    expect(anchor.attributes.download.endsWith(".json")).toBe(true);

    const prefix = "data:text/json;charset=utf-8,";
    expect(anchor.attributes.href!.startsWith(prefix)).toBe(true);
    const payload = JSON.parse(
      decodeURIComponent(anchor.attributes.href!.slice(prefix.length)),
    );

    expect(payload.openMinistryPlanVersion).toBe(1);
    expect(payload.title).toBe("Culto de Domingo — Noite");
    expect(payload.itemsCount).toBe(3);
    expect(payload.items.map((item: { order: number }) => item.order)).toEqual([
      0, 1, 2,
    ]);
    expect(payload.items[0]).toMatchObject({
      type: "header",
      title: "Louvor",
      durationSeconds: 0,
    });
    expect(payload.items[1]).toMatchObject({
      type: "item",
      description: "Mensagem da noite",
      durationSeconds: 1800,
      customResponsible: "Pastor João",
    });
    // Falls back to the assigned person when no free-text responsible exists.
    expect(payload.items[2].customResponsible).toBe("Maria");
  });

  it("refuses to export an empty plan", () => {
    exportPlanAsJson("Culto vazio", []);

    expect(anchors).toHaveLength(0);
    expect(toastCalls.error).toEqual(["Não há momentos para exportar."]);
  });
});

describe("time formatting", () => {
  it("formats event times in the church time zone", () => {
    expect(formatEventTime(new Date("2026-11-15T22:00:00Z"))).toBe("19h");
    expect(formatEventTime(new Date("2026-11-15T22:30:00Z"))).toBe("19h30");
    expect(
      formatEventTimeRange(
        new Date("2026-11-15T22:00:00Z"),
        new Date("2026-11-15T23:30:00Z"),
      ),
    ).toBe("19h – 20h30");
  });

  it("formats and parses durations for the plan editor inputs", () => {
    expect(formatDurationSeconds(0)).toBe("0:00");
    expect(formatDurationSeconds(690)).toBe("11:30");
    expect(parseDurationToSeconds("5:30")).toBe(330);
    expect(parseDurationToSeconds("10")).toBe(600);
    expect(parseDurationToSeconds(120)).toBe(120);
    expect(parseDurationToSeconds("")).toBe(0);
  });

  it("computes the event window from start and end times", () => {
    expect(computeDurationMinutes("19:00", "20:30")).toBe(90);
    expect(computeDurationMinutes("22:00", "01:00")).toBe(180);
    expect(computeDurationMinutes("", "20:30")).toBe(90);
    expect(computeEndTime("19:00", 90)).toBe("20:30");
    expect(computeEndTime("23:30", 60)).toBe("00:30");
  });
});

describe("computePlanItemTimes", () => {
  it("walks the plan in order without spending header time", () => {
    const startsAt = new Date("2026-11-15T22:00:00Z");
    const { computedItems, totalPlanSeconds } = computePlanItemTimes(startsAt, [
      {
        id: "header",
        eventId: "event-1",
        sectionId: null,
        type: "header",
        title: "Louvor",
        description: null,
        durationSeconds: 600,
        order: 0,
        personId: null,
        customResponsible: null,
      },
      {
        id: "song",
        eventId: "event-1",
        sectionId: null,
        type: "item",
        title: "Canção 1",
        description: null,
        durationSeconds: 300,
        order: 1,
        personId: null,
        customResponsible: null,
      },
      {
        id: "word",
        eventId: "event-1",
        sectionId: null,
        type: "item",
        title: "Palavra",
        description: null,
        durationSeconds: 1800,
        order: 2,
        personId: "person-1",
        customResponsible: null,
        person: {
          id: "person-1",
          name: "Maria",
          avatarUrl: null,
          user: { image: "https://example.com/maria.png" },
        },
      },
    ]);

    expect(totalPlanSeconds).toBe(2100);
    expect(computedItems.map((item) => item.timeLabel)).toEqual([
      "19:00",
      "19:00",
      "19:05",
    ]);
    expect(computedItems[0]!.calculatedEndTime).toEqual(
      computedItems[0]!.calculatedStartTime,
    );
    // Falls back to the user avatar when the person has no avatar of her own.
    expect(computedItems[2]!.person?.avatarUrl).toBe(
      "https://example.com/maria.png",
    );
    expect(computedItems[2]!.durationLabel).toBe("30:00");
  });
});

describe("schedule rules", () => {
  const voice = { id: "fn-voice", name: "Voz" };
  const guitar = { id: "fn-guitar", name: "Violão" };

  function makeEvent({
    id = "event-1",
    startsAt = new Date("2026-11-15T22:00:00Z"),
    departments = [
      { departmentId: "dept-1", functions: [voice, guitar] },
    ],
    functions = null as { functionId: string; departmentId: string }[] | null,
    assignments = [] as { functionId: string; departmentId: string }[],
  } = {}) {
    return {
      id,
      title: `Culto ${id}`,
      location: "Templo",
      startsAt,
      departments: departments.map((department) => ({
        departmentId: department.departmentId,
        department: { functions: department.functions },
      })),
      functions,
      schedule: { assignments },
    };
  }

  it("counts a function as filled only when someone is assigned", () => {
    const empty = makeEvent();
    expect(scheduleProgress(empty)).toEqual({
      totalFunctions: 2,
      filledFunctions: 0,
      assignmentsCount: 0,
      status: "empty",
    });
    expect(coverageStatus(empty)).toBe("empty");
    expect(needsAttention(empty)).toBe(true);

    const partial = makeEvent({
      assignments: [{ functionId: "fn-voice", departmentId: "dept-1" }],
    });
    expect(coverageStatus(partial)).toBe("partial");
    expect(isScaleComplete(partial)).toBe(false);

    const complete = makeEvent({
      assignments: [
        { functionId: "fn-voice", departmentId: "dept-1" },
        { functionId: "fn-guitar", departmentId: "dept-1" },
      ],
    });
    expect(coverageStatus(complete)).toBe("complete");
    expect(isScaleComplete(complete)).toBe(true);
    expect(needsAttention(complete)).toBe(false);
  });

  it("prefers the functions configured for the occurrence over the department defaults", () => {
    const event = makeEvent({
      functions: [{ functionId: "fn-voice", departmentId: "dept-1" }],
      assignments: [{ functionId: "fn-voice", departmentId: "dept-1" }],
    });

    expect(scheduleProgress(event).totalFunctions).toBe(1);
    expect(coverageStatus(event)).toBe("complete");
  });

  it("treats events without configured functions as setup work", () => {
    const setup = makeEvent({ departments: [] });
    expect(coverageStatus(setup)).toBe("setup");
    expect(needsAttention(setup)).toBe(true);
  });

  it("filters by coverage, department and query, and counts the result", () => {
    const empty = makeEvent({ id: "vazio" });
    const complete = makeEvent({
      id: "completo",
      assignments: [
        { functionId: "fn-voice", departmentId: "dept-1" },
        { functionId: "fn-guitar", departmentId: "dept-1" },
      ],
    });
    const otherDepartment = makeEvent({
      id: "outro",
      departments: [{ departmentId: "dept-2", functions: [voice] }],
    });

    const events = [empty, complete, otherDepartment];

    expect(filterEvents(events, { coverage: "complete" })).toEqual([complete]);
    expect(filterEvents(events, { coverage: "attention" })).toEqual([
      empty,
      otherDepartment,
    ]);
    expect(filterEvents(events, { departmentId: "dept-2" })).toEqual([
      otherDepartment,
    ]);
    expect(filterEvents(events, { query: "completo" })).toEqual([complete]);
    expect(filterEvents(events, { query: "  " })).toHaveLength(3);

    expect(coverageCounts(events)).toEqual({
      attention: 2,
      complete: 1,
      all: 3,
    });
  });

  it("accepts only known coverage filters from the URL", () => {
    expect(parseCoverageFilter("attention")).toBe("attention");
    expect(parseCoverageFilter(["complete", "attention"])).toBe("complete");
    expect(parseCoverageFilter("all")).toBe("all");
    expect(parseCoverageFilter("qualquer")).toBeNull();
    expect(parseCoverageFilter(undefined)).toBeNull();
  });

  it("renders EventFilters without an outer container border box", async () => {
    const source = await Bun.file(
      new URL("../../features/events/components/event-filters.tsx", import.meta.url),
    ).text();

    expect(source).not.toContain("border-border/70 bg-card/60 p-3");
    expect(source).toContain(
      'className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"',
    );
  });
});
