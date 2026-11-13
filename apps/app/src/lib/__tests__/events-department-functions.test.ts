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
  scheduleProgress,
  coverageStatus,
  buildDepartmentCoverage,
} = await import("@/lib/events");

describe("Event Department Functions Configuration", () => {
  const mediaFunctions = [
    { id: "fn_projecao", name: "Projeção" },
    { id: "fn_livestream", name: "Livestream" },
    { id: "fn_storymaker", name: "Storymaker" },
  ];

  it("calculates scheduleProgress based only on the configured active functions", () => {
    // Event where only Projeção and Livestream are configured for Midia
    const event = {
      departments: [
        {
          departmentId: "dept_midia",
          department: { id: "dept_midia", functions: mediaFunctions },
        },
      ],
      functions: [
        { departmentId: "dept_midia", functionId: "fn_projecao" },
        { departmentId: "dept_midia", functionId: "fn_livestream" },
      ],
      schedule: {
        assignments: [
          { functionId: "fn_projecao" },
          { functionId: "fn_livestream" },
        ],
      },
    };

    const progress = scheduleProgress(event);

    // Total should be 2, NOT 3 (Storymaker is excluded from this event)
    expect(progress.totalFunctions).toBe(2);
    expect(progress.filledFunctions).toBe(2);
    expect(progress.status).toBe("complete");
    expect(coverageStatus(event as any)).toBe("complete");
  });

  it("falls back to all department functions when no function overrides exist", () => {
    // Legacy event or event without function overrides
    const event = {
      departments: [
        {
          departmentId: "dept_midia",
          department: { id: "dept_midia", functions: mediaFunctions },
        },
      ],
      functions: [],
      schedule: {
        assignments: [{ functionId: "fn_projecao" }],
      },
    };

    const progress = scheduleProgress(event);

    // Falls back to all 3 functions
    expect(progress.totalFunctions).toBe(3);
    expect(progress.filledFunctions).toBe(1);
    expect(progress.status).toBe("partial");
    expect(coverageStatus(event as any)).toBe("partial");
  });

  it("buildDepartmentCoverage accurately counts only active slots and ignores excluded functions", () => {
    const event = {
      id: "event_1",
      title: "Culto de Domingo",
      location: null,
      startsAt: new Date("2026-11-15T19:00:00Z"),
      departments: [
        {
          departmentId: "dept_midia",
          department: { functions: mediaFunctions },
        },
      ],
      functions: [
        { departmentId: "dept_midia", functionId: "fn_projecao" },
      ],
      schedule: {
        assignments: [
          { departmentId: "dept_midia", functionId: "fn_projecao" },
        ],
      },
    };

    const coverage = buildDepartmentCoverage(
      [event as any],
      [{ id: "dept_midia", name: "Mídia" }],
    );

    expect(coverage).toHaveLength(1);
    expect(coverage[0].totalSlots).toBe(1); // Only Projeção
    expect(coverage[0].coveredSlots).toBe(1);
    expect(coverage[0].eventsWithGaps).toBe(0);
    expect(coverage[0].nextGap).toBeNull();
  });

  it("buildDepartmentCoverage detects gaps only among configured functions", () => {
    const event = {
      id: "event_1",
      title: "Culto de Domingo",
      location: null,
      startsAt: new Date("2026-11-15T19:00:00Z"),
      departments: [
        {
          departmentId: "dept_midia",
          department: { functions: mediaFunctions },
        },
      ],
      functions: [
        { departmentId: "dept_midia", functionId: "fn_projecao" },
        { departmentId: "dept_midia", functionId: "fn_livestream" },
      ],
      schedule: {
        assignments: [
          { departmentId: "dept_midia", functionId: "fn_projecao" },
        ],
      },
    };

    const coverage = buildDepartmentCoverage(
      [event as any],
      [{ id: "dept_midia", name: "Mídia" }],
    );

    expect(coverage).toHaveLength(1);
    expect(coverage[0].totalSlots).toBe(2);
    expect(coverage[0].coveredSlots).toBe(1);
    expect(coverage[0].eventsWithGaps).toBe(1);
    expect(coverage[0].nextGap?.missingFunctions).toEqual(["Livestream"]);
    // Storymaker was not configured, so it is NOT missing!
    expect(coverage[0].nextGap?.missingFunctions).not.toContain("Storymaker");
  });
});
