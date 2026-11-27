import { beforeEach, describe, expect, it, mock } from "bun:test";

type CookieInput = {
  name: string;
  value: string;
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

let currentSession: {
  user: { id: string };
  session: { impersonatedBy?: string | null };
} | null = { user: { id: "admin-1" }, session: {} };
let targetUser: { role: string | null; email: string } | null = null;
let impersonateCalls = 0;
let stopImpersonatingCalls = 0;
const sessionReadCalls: Array<{ query?: { disableCookieCache?: boolean } }> = [];
const cookieWrites: CookieInput[] = [];

const existingCookies = [
  { name: "better-auth.session_token", value: "token" },
  { name: "better-auth.session_data", value: "cache" },
  { name: "better-auth.session_data.0", value: "chunk" },
  { name: "__Secure-better-auth.session_data", value: "secure-cache" },
  { name: "__Secure-better-auth.session_data.0", value: "secure-chunk" },
  { name: "theme", value: "dark" },
];

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    getAll: () => existingCookies,
    set: (input: CookieInput) => {
      cookieWrites.push(input);
    },
  }),
}));
mock.module("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
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
      stopImpersonating: async () => {
        stopImpersonatingCalls += 1;
        return { success: true };
      },
      getSession: async (args: { query?: { disableCookieCache?: boolean } }) => {
        sessionReadCalls.push(args ?? {});
        return currentSession;
      },
    },
  },
}));

const { impersonateMemberAction, stopImpersonatingAction } = await import(
  "@/app/actions/impersonation"
);

beforeEach(() => {
  sessionReadCalls.length = 0;
  cookieWrites.length = 0;
  impersonateCalls = 0;
  stopImpersonatingCalls = 0;
});

function expectFreshSessionReads() {
  expect(sessionReadCalls.length).toBeGreaterThan(0);
  for (const call of sessionReadCalls) {
    expect(call.query?.disableCookieCache).toBe(true);
  }
}

function expectSessionDataExpired() {
  const names = cookieWrites.map((cookie) => cookie.name);
  for (const name of [
    "better-auth.session_data",
    "better-auth.session_data.0",
    "__Secure-better-auth.session_data",
    "__Secure-better-auth.session_data.0",
  ]) {
    expect(names).toContain(name);
  }
  expect(names).not.toContain("better-auth.session_token");
  expect(names).not.toContain("theme");
  for (const cookie of cookieWrites) {
    expect(cookie.value).toBe("");
    expect(cookie.path).toBe("/");
    expect(cookie.maxAge).toBe(0);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
  }

  // RFC 6265bis: __Secure-*/__Host-* sem Secure são ignorados pelo navegador.
  const secureCookies = cookieWrites.filter((cookie) =>
    cookie.name.startsWith("__Secure-"),
  );
  expect(secureCookies).toHaveLength(2);
  for (const cookie of secureCookies) {
    expect(cookie.secure).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.path).toBe("/");
    expect(cookie.maxAge).toBe(0);
  }

  for (const cookie of cookieWrites.filter(
    (item) => !item.name.startsWith("__Secure-") && !item.name.startsWith("__Host-"),
  )) {
    expect(cookie.secure).toBeUndefined();
  }
}

describe("impersonação segura", () => {
  it("bloqueia impersonação de usuário com papel super_admin", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
    targetUser = { role: "super_admin", email: "ops@igreja.test" };
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";

    const result = await impersonateMemberAction("user-2");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("não pode ser acessada");
    expect(impersonateCalls).toBe(0);
  });

  it("bloqueia impersonação de e-mail de bootstrap", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
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
    targetUser = { role: "user", email: "membro@igreja.test" };

    const result = await impersonateMemberAction("user-2");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("durante uma impersonação");
    expect(impersonateCalls).toBe(0);
  });

  it("impersona com leitura fresca e expira o cookieCache sem reler a sessão", async () => {
    currentSession = { user: { id: "admin-1" }, session: {} };
    targetUser = { role: "user", email: "membro@igreja.test" };
    let redirected = false;
    try {
      await impersonateMemberAction("user-2");
    } catch (error) {
      redirected = error instanceof Error && error.message === "NEXT_REDIRECT";
    }

    expect(impersonateCalls).toBe(1);
    expect(redirected).toBe(true);
    expect(sessionReadCalls).toHaveLength(1);
    expectFreshSessionReads();
    expectSessionDataExpired();
  });

  it("sai da impersonação sem reler a sessão com headers antigos", async () => {
    currentSession = {
      user: { id: "user-2" },
      session: { impersonatedBy: "admin-1" },
    };

    const result = await stopImpersonatingAction();

    expect(result).toEqual({ ok: true });
    expect(stopImpersonatingCalls).toBe(1);
    expect(sessionReadCalls).toHaveLength(1);
    expectFreshSessionReads();
    expectSessionDataExpired();
  });
});
