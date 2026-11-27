import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

let currentSession: {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    role: string | null;
  };
  session: { impersonatedBy?: string | null };
} | null = null;
let permissionResult = { success: true };
const setRoleCalls: { userId: string; role: string }[] = [];
const getSessionCalls: Array<{ query?: { disableCookieCache?: boolean } }> = [];

mock.module("next/headers", () => ({
  headers: async () => new Headers(),
}));

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async (args: { query?: { disableCookieCache?: boolean } }) => {
        getSessionCalls.push(args ?? {});
        return currentSession;
      },
      setRole: async ({ body }: { body: { userId: string; role: string } }) => {
        setRoleCalls.push(body);
        currentSession = currentSession
          ? { ...currentSession, user: { ...currentSession.user, role: body.role } }
          : null;
        return { success: true };
      },
      userHasPermission: async () => permissionResult,
    },
  },
}));

mock.module("@/lib/session", () => ({
  getSession: async () => currentSession,
}));

const mockUserRows: { id: string; email: string; role: string | null }[] = [];
const roleUpdates: { id: string; role: string }[] = [];
let memberships: { role: string }[] = [];

mock.module("@/db", () => {
  const realSchema = { user: {}, member: {} };
  return {
    db: {
      query: {
        user: {
          findFirst: async () => mockUserRows[0] ?? null,
        },
        member: {
          findMany: async () => memberships,
        },
      },
      update: () => ({
        set: (value: { role: string }) => ({
          where: async () => {
            roleUpdates.push({
              id: currentSession?.user.id ?? mockUserRows[0]?.id ?? "unknown",
              role: value.role,
            });
            // auth.api.getSession relê o papel do banco após a promoção.
            if (currentSession) {
              currentSession = {
                ...currentSession,
                user: { ...currentSession.user, role: value.role },
              };
            }
          },
        }),
      }),
      insert: () => ({
        values: () => Promise.resolve(),
      }),
    },
    schema: realSchema,
  };
});

const {
  platformRoles,
  platformStatements,
} = await import("@/lib/platform/access-control");
const {
  isBootstrapSuperAdminEmail,
  isSuperAdminRole,
} = await import("@/lib/platform/super-admin-emails");
const { requireSuperAdmin, getSuperAdminSession, PlatformAccessError } =
  await import("@/lib/platform/auth");
const { syncUserAdminRole } = await import("@/lib/admin-role");

function makeSession(overrides: Partial<typeof currentSession> = {}) {
  return {
    user: {
      id: "user-1",
      email: "owner@igreja.test",
      emailVerified: true,
      role: "user",
    },
    session: {},
    ...overrides,
  } as NonNullable<typeof currentSession>;
}

describe("access control nativo", () => {
  it("super_admin tem todas as permissões da plataforma", () => {
    for (const permission of platformStatements.platform) {
      expect(
        platformRoles.super_admin.authorize({ platform: [permission] }).success,
      ).toBe(true);
    }
    expect(
      platformRoles.super_admin.authorize({ user: ["impersonate-admins"] })
        .success,
    ).toBe(true);
  });

  it("admin de igreja não tem nenhuma permissão de plataforma", () => {
    expect(
      platformRoles.admin.authorize({ platform: ["access"] }).success,
    ).toBe(false);
    expect(
      platformRoles.admin.authorize({ user: ["impersonate-admins"] }).success,
    ).toBe(true);
  });

  it("user não tem permissões privilegiadas", () => {
    expect(
      platformRoles.user.authorize({ platform: ["access"] }).success,
    ).toBe(false);
    expect(platformRoles.user.authorize({ user: ["list"] }).success).toBe(false);
  });
});

describe("bootstrap por e-mail", () => {
  it("faz parsing CSV case-insensitive", () => {
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = " Owner@Empresa.com , ops@empresa.com ";
    expect(isBootstrapSuperAdminEmail("owner@empresa.com")).toBe(true);
    expect(isBootstrapSuperAdminEmail("OTHER@empresa.com")).toBe(false);
    expect(isSuperAdminRole("admin,super_admin")).toBe(true);
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
  });
});

describe("requireSuperAdmin", () => {
  it("rejeita admin de igreja", async () => {
    currentSession = makeSession({ user: { ...makeSession().user, role: "admin" } });
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(PlatformAccessError);
  });

  it("rejeita sessão impersonada mesmo sendo super_admin", async () => {
    currentSession = makeSession({
      user: { ...makeSession().user, role: "super_admin" },
      session: { impersonatedBy: "admin-1" },
    });
    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(PlatformAccessError);
    expect(await getSuperAdminSession()).toBeNull();
  });

  it("promove e-mail bootstrap verificado e valida permissão nativa", async () => {
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "owner@igreja.test";
    setRoleCalls.length = 0;
    roleUpdates.length = 0;
    permissionResult = { success: true };
    currentSession = makeSession();
    const session = await requireSuperAdmin("manage-plans");
    expect(session.user.role).toBe("super_admin");
    // Bootstrap não usa auth.api.setRole (FALHA com FORBIDDEN sem a permissão
    // set-role): promove direto no banco e registra auditoria.
    expect(setRoleCalls).toEqual([]);
    expect(roleUpdates).toEqual([{ id: "user-1", role: "super_admin" }]);
    // Tanto a leitura inicial quanto a releitura após o bootstrap ignoram o
    // cookieCache, senão o papel antigo continuaria valendo por 5 minutos.
    expect(getSessionCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of getSessionCalls) {
      expect(call.query?.disableCookieCache).toBe(true);
    }
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
  });

  it("nop permission negada pelo Better Auth", async () => {
    currentSession = makeSession({
      user: { ...makeSession().user, role: "super_admin" },
    });
    permissionResult = { success: false };
    await expect(requireSuperAdmin("manage-operators")).rejects.toBeInstanceOf(
      PlatformAccessError,
    );
    permissionResult = { success: true };
  });
});

describe("cookieCache do Better Auth", () => {
  it("habilita cache de sessão no cookie por 5 minutos", () => {
    const source = readFileSync(
      new URL("../../auth.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("cookieCache:");
    expect(source).toContain("enabled: true");
    expect(source).toContain("maxAge: 5 * 60");
  });
});

describe("syncUserAdminRole protege super_admin", () => {
  it("não rebaixa usuário com role super_admin", async () => {
    mockUserRows.length = 0;
    roleUpdates.length = 0;
    mockUserRows.push({ id: "user-1", email: "owner@igreja.test", role: "super_admin" });
    memberships = [];
    await syncUserAdminRole("user-1");
    expect(roleUpdates).toEqual([]);
  });

  it("não rebaixa e-mail bootstrap", async () => {
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "owner@igreja.test";
    mockUserRows.length = 0;
    roleUpdates.length = 0;
    mockUserRows.push({ id: "user-1", email: "owner@igreja.test", role: null });
    await syncUserAdminRole("user-1");
    expect(roleUpdates).toEqual([]);
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
  });

  it("mantém admin de igreja quando há vínculo admin", async () => {
    mockUserRows.length = 0;
    roleUpdates.length = 0;
    mockUserRows.push({ id: "user-1", email: "admin@igreja.test", role: "user" });
    memberships = [{ role: "admin" }];
    await syncUserAdminRole("user-1");
    expect(roleUpdates).toEqual([{ id: "user-1", role: "admin" }]);
  });
});
