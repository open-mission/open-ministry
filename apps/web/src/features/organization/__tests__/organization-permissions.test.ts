import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

// Mock requireOrganizationContext
let mockContext = {
  session: { user: { id: "user-1", name: "User" } },
  organization: { id: "org-1", name: "Church" },
  role: "admin",
  isAdmin: true,
};

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => mockContext,
  getOrganizationContext: async () => mockContext,
}));

// Mock db for testing action validations and isolation
const fakeOrgModules = new Map<string, boolean>();
const fakeRolePermissions = new Map<string, boolean>();
const fakeDeptModules = new Map<string, boolean>();

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {
        organizationModule: {
          findMany: async () =>
            Array.from(fakeOrgModules.entries()).map(([k, enabled]) => {
              const [orgId, moduleKey] = k.split(":");
              return { organizationId: orgId, moduleKey, enabled };
            }),
          findFirst: async () => null,
        },
        organizationRolePermission: {
          findMany: async () =>
            Array.from(fakeRolePermissions.entries()).map(([k, enabled]) => {
              const [orgId, role, moduleKey, action] = k.split(":");
              return { organizationId: orgId, role, moduleKey, action, enabled };
            }),
        },
        departmentModule: {
          findMany: async () =>
            Array.from(fakeDeptModules.entries()).map(([k]) => {
              const [departmentId, moduleKey] = k.split(":");
              return { departmentId, moduleKey };
            }),
        },
      },
      {
        get(target: any, prop: string) {
          if (prop in target) return target[prop];
          return {
            findFirst: async () => null,
            findMany: async () => [],
          };
        },
      },
    ),
    insert: () => ({
      values: (val: any) => ({
        onConflictDoUpdate: async () => {
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item.action) {
                fakeRolePermissions.set(
                  `${item.organizationId}:${item.role}:${item.moduleKey}:${item.action}`,
                  item.enabled,
                );
              } else {
                fakeOrgModules.set(
                  `${item.organizationId}:${item.moduleKey}`,
                  item.enabled,
                );
              }
            }
          } else if (val.action) {
            fakeRolePermissions.set(
              `${val.organizationId}:${val.role}:${val.moduleKey}:${val.action}`,
              val.enabled,
            );
          } else {
            fakeOrgModules.set(
              `${val.organizationId}:${val.moduleKey}`,
              val.enabled,
            );
          }
        },
        onConflictDoNothing: async () => {},
        returning: async () => (Array.isArray(val) ? val : [val]),
      }),
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    delete: () => ({ where: async () => {} }),
  },
}));

mock.module("@/lib/cache", () => ({
  cacheInvalidateTags: async () => {},
  remember: async (_key: string, _ttl: number, fn: () => any) => fn(),
}));

const {
  getOrganizationPermissionSettingsAction,
  setOrganizationModuleEnabledAction,
  setOrganizationRolePermissionAction,
} = await import("@/app/actions/permissions");

describe("Church and Role Permission Settings Actions", () => {
  it("nonAdminCannotReadGlobalPolicy", async () => {
    mockContext = {
      ...mockContext,
      role: "member",
      isAdmin: false,
    };

    const result = await getOrganizationPermissionSettingsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("administrador");
    }
  });

  it("nonAdminCannotChangeOrganizationModule", async () => {
    mockContext = {
      ...mockContext,
      role: "member",
      isAdmin: false,
    };

    const result = await setOrganizationModuleEnabledAction("agenda", false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("administrador");
    }
  });

  it("nonAdminCannotChangeRolePolicy", async () => {
    mockContext = {
      ...mockContext,
      role: "member",
      isAdmin: false,
    };

    const result = await setOrganizationRolePermissionAction(
      "member",
      "agenda",
      "createEvent",
      true,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("administrador");
    }
  });

  it("unknownModuleOrActionIsRejected", async () => {
    mockContext = {
      ...mockContext,
      role: "admin",
      isAdmin: true,
    };

    const invalidModule = await setOrganizationModuleEnabledAction(
      "invalidMod" as any,
      true,
    );
    expect(invalidModule.ok).toBe(false);

    const invalidAction = await setOrganizationRolePermissionAction(
      "member",
      "agenda",
      "nonExistentAction" as any,
      true,
    );
    expect(invalidAction.ok).toBe(false);
  });

  it("disablingChurchModulePreservesDepartmentChoice", async () => {
    mockContext = {
      ...mockContext,
      role: "admin",
      isAdmin: true,
    };

    // Pre-populate a department module choice
    fakeDeptModules.set("dept-1:music", true);

    // Disable music on church level
    const disableResult = await setOrganizationModuleEnabledAction(
      "music",
      false,
    );
    expect(disableResult.ok).toBe(true);

    // Check that department choice was preserved
    expect(fakeDeptModules.has("dept-1:music")).toBe(true);
  });

  it("settingsCanReenableDisabledModule", async () => {
    mockContext = {
      ...mockContext,
      role: "admin",
      isAdmin: true,
    };

    // Re-enable music
    const enableResult = await setOrganizationModuleEnabledAction(
      "music",
      true,
    );
    expect(enableResult.ok).toBe(true);
    expect(fakeOrgModules.get("org-1:music")).toBe(true);
  });
});
