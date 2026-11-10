import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

let mockUser = { id: "user-leader", name: "Leader" };
let mockOrg = { id: "org-1", name: "Church" };
let mockIsAdmin = false;
let mockOrgAnnouncementsEnabled = true;

const ledDepartmentIds = ["dept-led"];

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
    scope?: { departmentId?: string; targetPersonId?: string },
  ) => {
    if (moduleKey !== "announcements") return false;
    if (!mockOrgAnnouncementsEnabled) return false;
    if (mockIsAdmin) return true;

    if (action === "read") return true;

    if (action === "sendDepartment") {
      return Boolean(scope?.departmentId && ledDepartmentIds.includes(scope.departmentId));
    }

    if (action === "sendPerson") {
      // Allowed if target belongs to a led department
      return scope?.targetPersonId === "person-in-led-dept";
    }

    if (action === "sendAll") {
      return mockIsAdmin;
    }

    if (action === "retryDelivery") {
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
    if (moduleKey === "announcements") return mockOrgAnnouncementsEnabled;
    return true;
  },
}));

mock.module("@/lib/departments", () => ({
  listUserLeaderDepartments: async () => {
    if (mockIsAdmin) {
      return [{ id: "dept-led", name: "Dept Led", members: [{ personId: "person-in-led-dept" }] }];
    }
    return [{ id: "dept-led", name: "Dept Led", members: [{ personId: "person-in-led-dept" }] }];
  },
  listDepartments: async () => [],
}));

mock.module("@/lib/notification-service", () => ({
  getOrganizationEvolutionConfig: async () => ({ config: null }),
  dispatchNotification: async () => {},
  retryFailedWhatsAppMessages: async () => ({ sent: 0 }),
  retryWhatsAppMessage: async () => ({ ok: true }),
}));

mock.module("@/lib/push-notifications", () => ({
  sendWebPushToUser: async () => {},
}));

const customQuery = {
  person: {
    findFirst: async ({ where }: any) => {
      return { id: "person-in-led-dept", userId: "user-target", phone: "5511999999999", name: "Target" };
    },
    findMany: async () => [
      { id: "person-in-led-dept", userId: "user-target", phone: "5511999999999", name: "Target" },
    ],
  },
  departmentMember: {
    findMany: async () => [
      {
        departmentId: "dept-led",
        personId: "person-in-led-dept",
        person: {
          id: "person-in-led-dept",
          userId: "user-target",
          phone: "5511999999999",
          name: "Target",
        },
      },
    ],
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

import {
  getRecentNotificationsAction,
  retryAnnouncementSingleWhatsAppAction,
  retryAnnouncementWhatsAppAction,
  sendAnnouncementAction,
} from "@/app/actions/notifications";

describe("Announcement Module Permissions", () => {
  it("leaderCanSendToLedDepartment", async () => {
    mockIsAdmin = false;
    mockOrgAnnouncementsEnabled = true;

    const formData = new FormData();
    formData.set("title", "Aviso do Departamento");
    formData.set("body", "Reunião amanhã");
    formData.set("audienceType", "department");
    formData.set("departmentId", "dept-led");
    formData.set("sendInApp", "true");

    const res = await sendAnnouncementAction(undefined, formData);
    expect(res?.error).toBeUndefined();
  });

  it("leaderCannotSendToAllChurch", async () => {
    mockIsAdmin = false;
    mockOrgAnnouncementsEnabled = true;

    const formData = new FormData();
    formData.set("title", "Aviso Geral");
    formData.set("body", "Aviso para todos");
    formData.set("audienceType", "all");
    formData.set("sendInApp", "true");

    const res = await sendAnnouncementAction(undefined, formData);
    expect(res?.error).toBeDefined();
  });

  it("leaderCannotSendToPersonOutsideLedDepartment", async () => {
    mockIsAdmin = false;
    mockOrgAnnouncementsEnabled = true;

    const formData = new FormData();
    formData.set("title", "Aviso Direto");
    formData.set("body", "Mensagem pessoal");
    formData.set("audienceType", "person");
    formData.set("personId", "person-outside");
    formData.set("sendInApp", "true");

    const res = await sendAnnouncementAction(undefined, formData);
    expect(res?.error).toBeDefined();
  });

  it("nonAdminCannotRetryChurchDelivery", async () => {
    mockIsAdmin = false;
    mockOrgAnnouncementsEnabled = true;

    const batchRes = await retryAnnouncementWhatsAppAction();
    expect(batchRes.ok).toBe(false);

    const singleRes = await retryAnnouncementSingleWhatsAppAction("log-1");
    expect(singleRes.ok).toBe(false);
  });

  it("personalNotificationReadDoesNotRequireAnnouncementModule", async () => {
    mockIsAdmin = false;
    mockOrgAnnouncementsEnabled = false; // Módulo avisos desabilitado

    // Ler notificações pessoais continua funcionando
    const notifs = await getRecentNotificationsAction();
    expect(Array.isArray(notifs)).toBe(true);
  });
});
