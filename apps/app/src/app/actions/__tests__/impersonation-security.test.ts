import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));

let currentSession: {
  user: { id: string };
  session: { impersonatedBy?: string | null };
} | null = { user: { id: "admin-1" }, session: {} };
let targetUser: { role: string | null; email: string } | null = null;
let impersonateCalls = 0;

mock.module("@/lib/session", () => ({
  getSession: async () => currentSession,
}));

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => ({
    isAdmin: true,
    organization: { id: "org-1" },
    session: { user: { id: "admin-1" } },
  }),
}));

mock.module("@/db", () => ({
  db: {
    query: {
      member: { findFirst: async () => ({ id: "membership-1" }) },
      user: { findFirst: async () => targetUser },
    },
    update: () => ({
      set: () => ({ where: async () => ({ rowCount: 1 }) }),
    }),
  },
  schema: {
    member: { organizationId: "organization_id", userId: "user_id" },
    user: { id: "id" },
    session: { id: "id" },
  },
}));

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      impersonateUser: async () => {
        impersonateCalls += 1;
        return { session: { id: "session-1" } };
      },
    },
  },
}));

const { impersonateMemberAction } = await import(
  "@/app/actions/impersonation"
);

describe("impersonação segura", () => {
  it("bloqueia impersonação de usuário com papel super_admin", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
    impersonateCalls = 0;
    targetUser = { role: "super_admin", email: "ops@igreja.test" };
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
    const result = await impersonateMemberAction("user-2");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("não pode ser acessada");
    expect(impersonateCalls).toBe(0);
  });

  it("bloqueia impersonação de e-mail de bootstrap", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
    impersonateCalls = 0;
    targetUser = { role: "user", email: "owner@igreja.test" };
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "owner@igreja.test";
    const result = await impersonateMemberAction("user-2");
    expect(result.ok).toBe(false);
    expect(impersonateCalls).toBe(0);
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
  });

  it("bloqueia nova impersonação durante sessão já impersonada", async () => {
    currentSession = {
      user: { id: "admin-1" },
      session: { impersonatedBy: "admin-1" },
    };
    impersonateCalls = 0;
    targetUser = { role: "user", email: "membro@igreja.test" };
    const result = await impersonateMemberAction("user-2");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("durante uma impersonação");
    expect(impersonateCalls).toBe(0);
  });

  it("permite impersonar membro comum", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
    impersonateCalls = 0;
    targetUser = { role: "user", email: "membro@igreja.test" };
    let redirected = false;
    try {
      await impersonateMemberAction("user-2");
    } catch (error) {
      redirected = error instanceof Error && error.message === "NEXT_REDIRECT";
    }
    expect(impersonateCalls).toBe(1);
    expect(redirected).toBe(true);
  });
});
