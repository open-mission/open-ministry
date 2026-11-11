import { describe, expect, it, mock } from "bun:test";

mock.module("@/db", () => ({ db: {} }));
mock.module("@/lib/cache", () => ({
  remember: async (
    _key: string,
    _ttl: number,
    fetcher: () => Promise<unknown>,
  ) => fetcher(),
}));

const {
  buildDepartmentCoverage,
  coverageCounts,
  coverageStatus,
  filterEvents,
  parseCoverageFilter,
  relativeDayLabel,
} = await import("@/lib/events");

function makeEvent({
  id,
  title = id,
  location = null,
  startsAt = new Date("2026-11-15T22:00:00Z"),
  departments = [],
  assignments = [],
}: {
  id: string;
  title?: string;
  location?: string | null;
  startsAt?: Date;
  departments?: {
    departmentId: string;
    functions: { id: string; name: string }[];
  }[];
  assignments?: { functionId: string; departmentId: string }[];
}) {
  return {
    id,
    title,
    location,
    startsAt,
    departments: departments.map((department) => ({
      departmentId: department.departmentId,
      department: { functions: department.functions },
    })),
    schedule: { assignments },
  };
}

const voiceAndGuitar = [
  { id: "f1", name: "Voz" },
  { id: "f2", name: "Violão" },
];

describe("coverageStatus", () => {
  it("treats events without functions as setup work", () => {
    const event = makeEvent({
      id: "setup",
      departments: [{ departmentId: "d1", functions: [] }],
    });

    expect(coverageStatus(event)).toBe("setup");
  });

  it("distinguishes an empty scale from a partial one", () => {
    const empty = makeEvent({
      id: "empty",
      departments: [{ departmentId: "d1", functions: voiceAndGuitar }],
    });
    const partial = makeEvent({
      id: "partial",
      departments: [{ departmentId: "d1", functions: voiceAndGuitar }],
      assignments: [{ functionId: "f1", departmentId: "d1" }],
    });

    expect(coverageStatus(empty)).toBe("empty");
    expect(coverageStatus(partial)).toBe("partial");
  });

  it("is complete when every function has at least one person", () => {
    const event = makeEvent({
      id: "complete",
      departments: [{ departmentId: "d1", functions: voiceAndGuitar }],
      assignments: [
        { functionId: "f1", departmentId: "d1" },
        { functionId: "f1", departmentId: "d1" },
        { functionId: "f2", departmentId: "d1" },
      ],
    });

    expect(coverageStatus(event)).toBe("complete");
  });
});

describe("filterEvents", () => {
  const events = [
    makeEvent({
      id: "complete",
      title: "Culto de domingo",
      departments: [{ departmentId: "d1", functions: voiceAndGuitar }],
      assignments: [
        { functionId: "f1", departmentId: "d1" },
        { functionId: "f2", departmentId: "d1" },
      ],
    }),
    makeEvent({
      id: "partial",
      title: "Ensaio do louvor",
      location: "Sala 2",
      departments: [{ departmentId: "d2", functions: voiceAndGuitar }],
      assignments: [{ functionId: "f1", departmentId: "d2" }],
    }),
    makeEvent({ id: "setup", title: "Reunião de líderes" }),
  ];

  it("filters by coverage, department and search term", () => {
    expect(
      filterEvents(events, { coverage: "attention" }).map((event) => event.id),
    ).toEqual(["partial", "setup"]);

    expect(
      filterEvents(events, { departmentId: "d2" }).map((event) => event.id),
    ).toEqual(["partial"]);

    expect(
      filterEvents(events, { query: "ensaio" }).map((event) => event.id),
    ).toEqual(["partial"]);

    expect(
      filterEvents(events, { query: "sala 2" }).map((event) => event.id),
    ).toEqual(["partial"]);
  });

  it("counts attention and complete events", () => {
    expect(coverageCounts(events)).toEqual({
      attention: 2,
      complete: 1,
      all: 3,
    });
  });
});

describe("buildDepartmentCoverage", () => {
  const events = [
    makeEvent({
      id: "ev-1",
      departments: [
        { departmentId: "d1", functions: voiceAndGuitar },
        { departmentId: "d2", functions: [] },
      ],
      assignments: [{ functionId: "f1", departmentId: "d1" }],
    }),
    makeEvent({
      id: "ev-2",
      startsAt: new Date("2026-11-22T22:00:00Z"),
      departments: [{ departmentId: "d1", functions: voiceAndGuitar }],
      assignments: [
        { functionId: "f1", departmentId: "d1" },
        { functionId: "f2", departmentId: "d1" },
      ],
    }),
  ];

  it("summarises slots and the next gap per department", () => {
    const board = buildDepartmentCoverage(events, [
      { id: "d1", name: "Louvor" },
      { id: "d2", name: "Mídia" },
      { id: "d3", name: "Diaconia" },
    ]);

    expect(board).toHaveLength(2);

    const worship = board.find((item) => item.departmentId === "d1");
    expect(worship).toMatchObject({
      eventsCount: 2,
      totalSlots: 4,
      coveredSlots: 3,
      eventsWithGaps: 1,
      nextGap: {
        eventId: "ev-1",
        eventTitle: "ev-1",
        missingFunctions: ["Violão"],
      },
    });

    const media = board.find((item) => item.departmentId === "d2");
    expect(media).toMatchObject({
      eventsCount: 1,
      totalSlots: 0,
      coveredSlots: 0,
      eventsWithGaps: 0,
      nextGap: null,
    });
  });
});

describe("date and filter helpers", () => {
  const now = new Date("2026-11-11T15:00:00Z");

  it("labels yesterday, today and tomorrow", () => {
    expect(relativeDayLabel(new Date("2026-11-10T15:00:00Z"), now)).toBe(
      "Ontem",
    );
    expect(relativeDayLabel(new Date("2026-11-11T15:00:00Z"), now)).toBe(
      "Hoje",
    );
    expect(relativeDayLabel(new Date("2026-11-12T15:00:00Z"), now)).toBe(
      "Amanhã",
    );
    expect(relativeDayLabel(new Date("2026-11-20T15:00:00Z"), now)).toBeNull();
  });

  it("parses only known coverage filters", () => {
    expect(parseCoverageFilter("attention")).toBe("attention");
    expect(parseCoverageFilter("complete")).toBe("complete");
    expect(parseCoverageFilter(["all"])).toBe("all");
    expect(parseCoverageFilter("unknown")).toBeNull();
    expect(parseCoverageFilter(undefined)).toBeNull();
  });
});
