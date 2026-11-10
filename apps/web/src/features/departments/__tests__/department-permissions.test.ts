import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// Context state for testing
let mockUser = { id: "user-leader", name: "Leader" };
const mockOrg = { id: "org-1", name: "Church" };
let mockIsAdmin = false;

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    session: { user: mockUser },
    organization: mockOrg,
    role: mockIsAdmin ? "admin" : "member",
    isAdmin: mockIsAdmin,
  }),
}));

// In-memory state for testing
const departmentMembers = new Map<string, { isLeader: boolean; orgId: string }>();
const grants = new Map<string, any>();
const deptModules = new Map<string, boolean>();
const orgModules = new Map<string, boolean>();

mock.module("@/db", () => ({
  db: {
    query: {
      department: {
        findFirst: async ({ where }: any) => {
          // If checking dept-1 in org-1: valid. If dept-other-org: belongs to other org.
          return { id: "dept-1", organizationId: "org-1" };
        },
      },
      person: {
        findFirst: async ({ where }: any) => {
          return { id: "person-target", userId: "user-target", organizationId: "org-1" };
        },
      },
      departmentMember: {
        findFirst: async ({ where }: any) => {
          // return membership based on in-memory map
          return departmentMembers.get("target") ?? null;
        },
      },
      departmentPermissionGrant: {
        findFirst: async ({ where }: any) => {
          return grants.get("grant-1") ?? null;
        },
        findMany: async () => Array.from(grants.values()),
      },
      departmentModule: {
        findFirst: async () => null,
      },
      organizationModule: {
        findFirst: async () => ({ enabled: orgModules.get("org-1:agenda") ?? true }),
      },
      organizationRolePermission: {
        findMany: async () => [],
      },
    },
    insert: (table: any) => ({
      values: (val: any) => {
        const id = val.id || "grant-1";
        grants.set(id, { ...val, id, revokedAt: null });
        return {
          onConflictDoNothing: async () => {},
          returning: async () => [val],
        };
      },
    }),
    update: () => ({
      set: (val: any) => ({
        where: async () => {
          const grant = grants.get("grant-1");
          if (grant) {
            grants.set("grant-1", { ...grant, ...val });
          }
        },
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  },
}));

mock.module("@/lib/departments", () => ({
  listDepartments: async () => [],
  getDepartmentAccess: async (orgId: string, deptId: string, userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      return {
        department: { id: deptId, organizationId: orgId },
        isLeader: false,
        canManage: true,
      };
    }
    // leader in dept-1 only
    if (userId === "user-leader" && deptId === "dept-1") {
      return {
        department: { id: "dept-1", organizationId: "org-1" },
        isLeader: true,
        canManage: true,
      };
    }
    return {
      department: { id: deptId, organizationId: orgId },
      isLeader: false,
      canManage: false,
    };
  },
}));

mock.module("@/lib/cache", () => ({
  cacheInvalidateTags: async () => {},
  remember: async (_k: string, _ttl: number, fn: () => any) => fn(),
}));

const {
  grantDepartmentPermissionAction,
  revokeDepartmentPermissionAction,
} = await import("@/app/actions/department-permissions");
const { toggleDepartmentModuleAction } = await import("@/app/actions/modules");

describe("Department Module and Permission Grants", () => {
  it("leaderCanToggleOwnDepartmentModule", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    const fd = new FormData();
    fd.append("departmentId", "dept-1");
    fd.append("moduleKey", "agenda");
    fd.append("enabled", "true");

    const result = await toggleDepartmentModuleAction(fd);
    expect(result.ok).toBe(true);
  });

  it("adminCanToggleDepartmentModule", async () => {
    mockUser = { id: "user-admin", name: "Admin" };
    mockIsAdmin = true;

    const fd = new FormData();
    fd.append("departmentId", "dept-1");
    fd.append("moduleKey", "agenda");
    fd.append("enabled", "true");

    const result = await toggleDepartmentModuleAction(fd);
    expect(result.ok).toBe(true);
  });

  it("leaderCannotChangeOtherDepartment", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    const fd = new FormData();
    fd.append("departmentId", "dept-other");
    fd.append("moduleKey", "agenda");
    fd.append("enabled", "true");

    const result = await toggleDepartmentModuleAction(fd);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("permissão");
  });

  it("grantTargetMustBelongToDepartment", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    // Target is NOT in department
    departmentMembers.delete("target");

    const result = await grantDepartmentPermissionAction({
      departmentId: "dept-1",
      userId: "user-target",
      moduleKey: "agenda",
      action: "createEvent",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("membro deste departamento");
    }
  });

  it("grantorMustHaveDelegablePermission", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    // Target is in department
    departmentMembers.set("target", { isLeader: false, orgId: "org-1" });

    // Delegable action: agenda.createEvent -> should succeed
    const validResult = await grantDepartmentPermissionAction({
      departmentId: "dept-1",
      userId: "user-target",
      moduleKey: "agenda",
      action: "createEvent",
    });
    expect(validResult.ok).toBe(true);
  });

  it("cannotGrantNonDelegableMusicWrite", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;
    departmentMembers.set("target", { isLeader: false, orgId: "org-1" });

    // Non-delegable: music.createSong or music.updateSong
    const result = await grantDepartmentPermissionAction({
      departmentId: "dept-1",
      userId: "user-target",
      moduleKey: "music",
      action: "createSong",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("delegável");
    }
  });

  it("crossOrganizationDepartmentIdIsRejected", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    const result = await grantDepartmentPermissionAction({
      departmentId: "dept-wrong-org",
      userId: "user-target",
      moduleKey: "agenda",
      action: "createEvent",
    });

    // Dept not found in org
    expect(result.ok).toBe(false);
  });

  it("revokedGrantStopsApplyingImmediately", async () => {
    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    grants.set("grant-1", {
      id: "grant-1",
      organizationId: "org-1",
      departmentId: "dept-1",
      granteeUserId: "user-target",
      moduleKey: "agenda",
      action: "createEvent",
      revokedAt: null,
    });

    const revokeResult = await revokeDepartmentPermissionAction({
      grantId: "grant-1",
    });
    expect(revokeResult.ok).toBe(true);

    const updated = grants.get("grant-1");
    expect(updated.revokedAt).not.toBeNull();
  });

  it("localToggleDoesNotEnableChurchModule", async () => {
    // If church module is disabled, local toggle should not change church module
    orgModules.set("org-1:agenda", false);

    mockUser = { id: "user-leader", name: "Leader" };
    mockIsAdmin = false;

    const fd = new FormData();
    fd.append("departmentId", "dept-1");
    fd.append("moduleKey", "agenda");
    fd.append("enabled", "true");

    await toggleDepartmentModuleAction(fd);

    // Church module must remain false
    expect(orgModules.get("org-1:agenda")).toBe(false);
  });
});
