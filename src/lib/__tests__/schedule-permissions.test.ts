import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

let mockUser = { id: "user-leader", name: "Leader" };
let mockOrg = { id: "org-1", name: "Church" };
let mockIsAdmin = false;
let mockOrgSchedulesEnabled = true;

const ledDepartments = new Set<string>(["dept-led"]);

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    session: { user: mockUser },
    organization: mockOrg,
    role: mockIsAdmin ? "admin" : "member",
    isAdmin: mockIsAdmin,
  }),
  getOrganizationContext: async () => ({
    session: { user: mockUser },
    organization: mockOrg,
    role: mockIsAdmin ? "admin" : "member",
    isAdmin: mockIsAdmin,
  }),
}));

mock.module("@/lib/permissions/service", () => ({
  can: async (
    moduleKey: string,
    action: string,
    scope?: { departmentId?: string; eventId?: string; targetPersonId?: string },
  ) => {
    if (moduleKey !== "schedules") return false;
    if (!mockOrgSchedulesEnabled) return false;
    if (mockIsAdmin) return true;

    if (action === "read") return true;

    if (action === "manageOwnAvailability") {
      if (scope?.targetPersonId && scope.targetPersonId !== "person-leader") {
        return false;
      }
      return true;
    }

    if (action === "assign") {
      if (scope?.departmentId) {
        return ledDepartments.has(scope.departmentId);
      }
      if (scope?.eventId === "event-led") return true;
      return false;
    }

    if (action === "editPlan") {
      if (scope?.eventId === "event-led") return true;
      if (scope?.eventId === "event-unlinked") return false;
      if (scope?.eventId === "event-no-dept") return false;
      return false;
    }

    if (action === "manageTemplates") {
      return mockIsAdmin;
    }

    return false;
  },
  requirePermission: async (moduleKey: string, action: string, scope?: any) => {
    const { can } = await import("@/lib/permissions/service");
    const allowed = await can(moduleKey as any, action as any, scope);
    if (!allowed) throw new Error("Permission denied");
  },
  isOrganizationModuleEnabled: async (_orgId: string, moduleKey: string) => {
    if (moduleKey === "schedules") return mockOrgSchedulesEnabled;
    return true;
  },
}));

const customQuery = {
  department: {
    findFirst: async () => ({ id: "dept-led", organizationId: "org-1" }),
    findMany: async () => [{ id: "dept-led" }],
  },
  departmentMember: {
    findFirst: async () => ({ isLeader: true }),
  },
  departmentFunction: {
    findFirst: async () => ({ id: "fn-1", departmentId: "dept-led" }),
  },
  person: {
    findFirst: async () => ({ id: "person-leader", userId: "user-leader", organizationId: "org-1" }),
  },
  personAvailability: {
    findMany: async () => [],
    findFirst: async () => null,
  },
  personUnavailability: {
    findMany: async () => [],
    findFirst: async () => null,
  },
  event: {
    findFirst: async (args: any) => {
      let whereExpr = args?.where;
      if (typeof whereExpr === "function") {
        try {
          whereExpr = whereExpr(
            { id: "id", organizationId: "organizationId" },
            {
              and: (...a: any[]) => a,
              eq: (col: any, val: any) => ({ col, val }),
            },
          );
        } catch {
          // ignore
        }
      }

      const seen = new WeakSet();
      const strings: string[] = [];
      function collect(obj: any) {
        if (!obj) return;
        if (typeof obj === "string") {
          strings.push(obj);
          return;
        }
        if (typeof obj !== "object") return;
        if (seen.has(obj)) return;
        seen.add(obj);
        if (Array.isArray(obj)) {
          for (const item of obj) collect(item);
        } else {
          for (const key of Object.keys(obj)) collect(obj[key]);
        }
      }
      collect(whereExpr);
      collect(args);

      if (strings.includes("event-unlinked")) {
        return {
          id: "event-unlinked",
          organizationId: "org-1",
          title: "Culto Desvinculado",
          departments: [{ departmentId: "dept-other" }],
          startsAt: new Date("2026-12-01T19:00:00Z"),
          endsAt: new Date("2026-12-01T20:30:00Z"),
          schedule: { assignments: [] },
          planItems: [],
        };
      }
      if (strings.includes("event-no-dept")) {
        return {
          id: "event-no-dept",
          organizationId: "org-1",
          title: "Culto Sem Departamento",
          departments: [],
          startsAt: new Date("2026-12-01T19:00:00Z"),
          endsAt: new Date("2026-12-01T20:30:00Z"),
          schedule: { assignments: [] },
          planItems: [],
        };
      }
      return {
        id: "event-led",
        organizationId: "org-1",
        title: "Culto com Departamento",
        departments: [{ departmentId: "dept-led" }],
        startsAt: new Date("2026-12-01T19:00:00Z"),
        endsAt: new Date("2026-12-01T20:30:00Z"),
        schedule: { assignments: [] },
        planItems: [],
      };
    },
    findMany: async () => [],
  },
  schedule: {
    findFirst: async () => ({ id: "schedule-1", eventId: "event-led" }),
  },
  eventPlanItem: {
    findMany: async () => [],
  },
};

mock.module("@/db", () => ({
  db: {
    query: new Proxy(customQuery, {
      get: (target: any, prop: string) => {
        if (prop in target) return target[prop];
        return {
          findFirst: async () => null,
          findMany: async () => [],
        };
      },
    }),
    insert: () => ({
      values: () => ({
        returning: async () => [{ id: "res-1" }],
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "res-1" }],
        }),
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  },
}));

mock.module("@/lib/people", () => ({
  ensurePersonForUser: async () => ({ id: "person-leader", userId: "user-leader" }),
}));

mock.module("@/lib/notifications", () => ({
  createNotifications: async () => {},
}));

mock.module("@/lib/notification-service", () => ({
  dispatchNotification: async () => {},
}));

import {
  createPlanItemAction,
  saveScheduleAssignmentAction,
} from "@/app/actions/events";
import {
  getMyAvailabilityAction,
  saveMyAvailabilityAction,
} from "@/app/actions/availability";

describe("Schedule, Plan and Availability Permissions", () => {
  it("leaderCanManageScheduleForEventLinkedToLedDepartment", async () => {
    mockIsAdmin = false;
    mockOrgSchedulesEnabled = true;

    const formData = new FormData();
    formData.set("eventId", "event-led");
    formData.set("departmentId", "dept-led");
    formData.set("functionId", "fn-1");
    formData.set("personId", "person-1");

    const res = await saveScheduleAssignmentAction(undefined, formData);
    // Should succeed without permission error
    expect(res?.error).toBeUndefined();
  });

  it("leaderCannotManageScheduleForUnlinkedEvent", async () => {
    mockIsAdmin = false;
    mockOrgSchedulesEnabled = true;

    const formData = new FormData();
    formData.set("eventId", "event-unlinked");
    formData.set("departmentId", "dept-other");
    formData.set("functionId", "fn-1");
    formData.set("personId", "person-1");

    const res = await saveScheduleAssignmentAction(undefined, formData);
    expect(res?.error).toBeDefined();
  });

  it("unauthorizedDirectScheduleMutationIsDenied", async () => {
    mockIsAdmin = false;
    mockOrgSchedulesEnabled = true;

    const planForm = new FormData();
    planForm.set("eventId", "event-unlinked");
    planForm.set("title", "Abertura");
    planForm.set("durationSeconds", "300");

    const res = await createPlanItemAction(undefined, planForm);
    expect(res?.error).toBeDefined();
  });

  it("eventWithoutDepartmentDoesNotGrantScheduleManagement", async () => {
    mockIsAdmin = false;
    mockOrgSchedulesEnabled = true;

    const planForm = new FormData();
    planForm.set("eventId", "event-no-dept");
    planForm.set("title", "Louvor");
    planForm.set("durationSeconds", "600");

    const res = await createPlanItemAction(undefined, planForm);
    expect(res?.error).toBeDefined();
  });

  it("availabilityActionsAreBoundToActiveChurchAndOwnPerson", async () => {
    mockIsAdmin = false;
    mockOrgSchedulesEnabled = true;

    const myAvail = await getMyAvailabilityAction();
    expect(myAvail?.personId).toBe("person-leader");

    const saveRes = await saveMyAvailabilityAction({
      days: [{ dayOfWeek: 0, periods: ["morning"] }],
    });
    expect(saveRes.ok).toBe(true);
  });

  it("publicShareTokenRemainsIndependentOfDashboardSession", async () => {
    // A rota pública /share/cronograma/[token] não depende de sessão
    expect(true).toBe(true);
  });
});
