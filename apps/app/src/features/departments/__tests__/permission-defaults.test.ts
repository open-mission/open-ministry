import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { MODULE_KEYS } = await import("@/lib/permissions/catalog");
const {
  buildDepartmentModuleRows,
  buildOrganizationModuleRows,
} = await import("@/lib/permissions/provisioning");

describe("Permission and Module Provisioning Defaults", () => {
  it("organizationSeedContainsExactlyInitialModules", () => {
    const orgId = "org-test-123";
    const rows = buildOrganizationModuleRows(orgId);

    expect(rows).toHaveLength(4);
    const keys = rows.map((r) => r.moduleKey);
    expect(keys.sort()).toEqual([...MODULE_KEYS].sort());

    // All initial modules must be enabled by default for organizations
    for (const row of rows) {
      expect(row.organizationId).toBe(orgId);
      expect(row.enabled).toBe(true);
    }
  });

  it("departmentSeedContainsOnlyCommonModules", () => {
    const orgId = "org-test-123";
    const deptId = "dept-test-456";
    const rows = buildDepartmentModuleRows(orgId, deptId);

    // Initial common department modules: agenda, schedules, announcements (music is opt-in)
    expect(rows).toHaveLength(3);
    const keys = rows.map((r) => r.moduleKey);
    expect(keys.sort()).toEqual(["agenda", "announcements", "schedules"]);

    // Music must NEVER appear in the default department seed
    expect(keys).not.toContain("music");

    for (const row of rows) {
      expect(row.departmentId).toBe(deptId);
    }
  });

  it("futureModuleHasNoEnabledSeed", () => {
    const orgId = "org-test-123";
    const orgRows = buildOrganizationModuleRows(orgId);

    // Verify only known initial modules are seeded
    const knownKeys = new Set(["agenda", "schedules", "music", "announcements"]);
    for (const row of orgRows) {
      expect(knownKeys.has(row.moduleKey)).toBe(true);
    }

    const deptRows = buildDepartmentModuleRows(orgId, "dept-1");
    for (const row of deptRows) {
      expect(knownKeys.has(row.moduleKey)).toBe(true);
      expect(row.moduleKey).not.toBe("music");
    }
  });
});
