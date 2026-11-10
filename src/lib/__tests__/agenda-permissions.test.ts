import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

let mockUser = { id: "user-leader", name: "Leader" };
let mockOrg = { id: "org-1", name: "Church" };
let mockIsAdmin = false;
let mockOrgAgendaEnabled = true;

// Mapeamento de departamentos liderados / ativos
const ledDepartments = new Set<string>(["dept-led"]);
const otherDepartments = new Set<string>(["dept-other"]);

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
  can: async (moduleKey: string, action: string, scope?: { departmentId?: string; eventId?: string }) => {
    if (moduleKey !== "agenda") return false;
    if (!mockOrgAgendaEnabled) return false;
    if (mockIsAdmin) return true;
    if (action === "read") return true;

    // Se scope for departamento
    if (scope?.departmentId) {
      return ledDepartments.has(scope.departmentId);
    }

    // Se scope for evento
    if (scope?.eventId) {
      if (scope.eventId === "event-led") return true;
      if (scope.eventId === "event-other") return false;
      if (scope.eventId === "event-no-dept") return false;
    }

    // Sem escopo (evento geral da igreja): somente admin
    return false;
  },
  requirePermission: async (moduleKey: string, action: string, scope?: any) => {
    const { can } = await import("@/lib/permissions/service");
    const allowed = await can(moduleKey as any, action as any, scope);
    if (!allowed) throw new Error("Permission denied");
  },
  isOrganizationModuleEnabled: async (_orgId: string, moduleKey: string) => {
    if (moduleKey === "agenda") return mockOrgAgendaEnabled;
    return true;
  },
}));

const customQuery = {
  department: {
    findMany: async (args: any) => {
      const seen = new WeakSet();
      const strings: string[] = [];
      function collect(obj: any) {
        if (!obj || typeof obj !== "object") {
          if (typeof obj === "string") strings.push(obj);
          return;
        }
        if (seen.has(obj)) return;
        seen.add(obj);
        if (Array.isArray(obj)) {
          for (const item of obj) collect(item);
        } else {
          for (const key of Object.keys(obj)) collect(obj[key]);
        }
      }
      collect(args);
      const results: { id: string }[] = [];
      if (strings.includes("dept-led")) results.push({ id: "dept-led" });
      if (strings.includes("dept-other")) results.push({ id: "dept-other" });
      return results;
    },
    findFirst: async () => ({ id: "dept-led", organizationId: "org-1" }),
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

      if (strings.includes("event-other")) {
        return {
          id: "event-other",
          organizationId: "org-1",
          title: "Culto de Outro Departamento",
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
          title: "Culto Geral",
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
        title: "Culto do Departamento",
        departments: [{ departmentId: "dept-led" }],
        startsAt: new Date("2026-12-01T19:00:00Z"),
        endsAt: new Date("2026-12-01T20:30:00Z"),
        schedule: { assignments: [] },
        planItems: [],
      };
    },
    findMany: async () => [],
  },
  user: {
    findFirst: async () => ({ weekStartsOn: 0, timezone: "America/Sao_Paulo" }),
  },
  personUnavailability: {
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
        returning: async () => [{ id: "event-1" }],
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "event-1" }],
        }),
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  },
}));

mock.module("@/lib/people", () => ({
  ensurePersonForUser: async () => ({ id: "person-1" }),
}));

mock.module("@/lib/notifications", () => ({
  createNotifications: async () => {},
}));

mock.module("@/lib/notification-service", () => ({
  dispatchNotification: async () => {},
}));

import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/actions/events";
import { getCalendarDataAction } from "@/app/actions/calendar";

describe("Agenda & Events Permissions Enforcement", () => {
  it("leaderCanManageEventsOnlyInLedDepartments", async () => {
    mockIsAdmin = false;
    mockOrgAgendaEnabled = true;

    // Tentativa em departamento liderado: permitido
    const formDataLed = new FormData();
    formDataLed.set("title", "Culto de Jovens");
    formDataLed.set("kind", "service");
    formDataLed.set("date", "2026-12-01");
    formDataLed.set("startTime", "19:00");
    formDataLed.set("durationMinutes", "90");
    formDataLed.set("recurrence", "none");
    formDataLed.append("departments", "dept-led");

    try {
      const resLed = await createEventAction(undefined, formDataLed);
      expect(resLed?.error).toBeUndefined();
    } catch (err: any) {
      expect(err.message).toBe("NEXT_REDIRECT");
    }

    // Tentativa em outro departamento: negado
    const formDataOther = new FormData();
    formDataOther.set("title", "Culto Infantil");
    formDataOther.set("kind", "service");
    formDataOther.set("date", "2026-12-01");
    formDataOther.set("startTime", "19:00");
    formDataOther.set("durationMinutes", "90");
    formDataOther.set("recurrence", "none");
    formDataOther.append("departments", "dept-other");

    const resOther = await createEventAction(undefined, formDataOther);
    expect(resOther?.error).toBeDefined();
  });

  it("leaderCannotEditAnotherDepartmentEvent", async () => {
    mockIsAdmin = false;
    mockOrgAgendaEnabled = true;

    // Editar evento de outro departamento
    const formData = new FormData();
    formData.set("eventId", "event-other");
    formData.set("scope", "single");
    formData.set("title", "Novo Titulo");
    formData.set("kind", "service");
    formData.set("date", "2026-12-01");
    formData.set("startTime", "19:00");
    formData.set("durationMinutes", "90");
    formData.append("departments", "dept-other");

    const res = await updateEventAction(undefined, formData);
    expect(res?.error).toBeDefined();

    const deleteForm = new FormData();
    deleteForm.set("eventId", "event-other");
    const deleteRes = await deleteEventAction(deleteForm);
    expect(deleteRes?.ok).toBe(false);
  });

  it("unauthorizedDirectEventActionIsDenied", async () => {
    mockIsAdmin = false;
    mockOrgAgendaEnabled = true;

    // Membro sem liderança não pode criar evento
    const formData = new FormData();
    formData.set("title", "Culto Teste");
    formData.set("kind", "service");
    formData.set("date", "2026-12-01");
    formData.set("startTime", "19:00");
    formData.set("durationMinutes", "90");
    formData.set("recurrence", "none");
    formData.append("departments", "dept-other");

    const res = await createEventAction(undefined, formData);
    expect(res?.error).toBeDefined();
  });

  it("unscopedEventUsesOrganizationPolicy", async () => {
    mockIsAdmin = false;
    mockOrgAgendaEnabled = true;

    // Evento sem departamento: líder de departamento NÃO tem autoridade
    const formData = new FormData();
    formData.set("title", "Culto Geral");
    formData.set("kind", "service");
    formData.set("date", "2026-12-01");
    formData.set("startTime", "19:00");
    formData.set("durationMinutes", "90");
    formData.set("recurrence", "none");
    // Sem departamentos

    const res = await createEventAction(undefined, formData);
    expect(res?.error).toBeDefined();

    // Se for Admin, permitido
    mockIsAdmin = true;
    try {
      const resAdmin = await createEventAction(undefined, formData);
      expect(resAdmin?.error).toBeUndefined();
    } catch (err: any) {
      expect(err.message).toBe("NEXT_REDIRECT");
    }
  });

  it("submittedDepartmentMustBelongToActiveChurch", async () => {
    mockIsAdmin = true; // Mesmo admin não pode passar departamento de outra igreja
    mockOrgAgendaEnabled = true;

    const formData = new FormData();
    formData.set("title", "Culto");
    formData.set("kind", "service");
    formData.set("date", "2026-12-01");
    formData.set("startTime", "19:00");
    formData.set("durationMinutes", "90");
    formData.set("recurrence", "none");
    formData.append("departments", "dept-foreign-church");

    const res = await createEventAction(undefined, formData);
    expect(res?.fieldErrors?.departments).toBeDefined();
  });

  it("disabledAgendaBlocksReadsAndWrites", async () => {
    mockIsAdmin = true;
    mockOrgAgendaEnabled = false;

    // Leitura do calendário bloqueada
    await expect(getCalendarDataAction()).rejects.toThrow();

    // Escrita bloqueada
    const formData = new FormData();
    formData.set("title", "Culto");
    formData.set("kind", "service");
    formData.set("date", "2026-12-01");
    formData.set("startTime", "19:00");
    formData.set("durationMinutes", "90");
    formData.set("recurrence", "none");

    const res = await createEventAction(undefined, formData);
    expect(res?.error).toBeDefined();
  });
});
