import { describe, expect, it, mock } from "bun:test";

let impersonated = false;
let handlerCalls = 0;

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => ({
        user: { id: "user-1" },
        session: { impersonatedBy: impersonated ? "admin-1" : null },
      }),
    },
  },
}));

mock.module("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: async () => {
      handlerCalls += 1;
      return new Response("ok", { status: 200 });
    },
    POST: async () => {
      handlerCalls += 1;
      return new Response("ok", { status: 200 });
    },
  }),
}));

const { GET, POST } = await import("@/app/api/auth/[...all]/route");

function request(pathname: string) {
  return new Request(`https://app.test${pathname}`, { method: "POST" });
}

describe("rotas sensíveis de credenciais", () => {
  it("bloqueia passkey em sessão impersonada", async () => {
    impersonated = true;
    handlerCalls = 0;
    const response = await POST(request("/api/auth/passkey/add-passkey"));
    expect(response.status).toBe(403);
    expect(handlerCalls).toBe(0);
  });

  it("bloqueia troca de senha, e-mail e 2FA em sessão impersonada", async () => {
    impersonated = true;
    for (const path of [
      "/api/auth/change-password",
      "/api/auth/change-email",
      "/api/auth/two-factor/enable",
      "/api/auth/update-user",
    ]) {
      handlerCalls = 0;
      const response = await POST(request(path));
      expect(response.status).toBe(403);
      expect(handlerCalls).toBe(0);
    }
  });

  it("preserva sign-out e endpoints não sensíveis", async () => {
    impersonated = true;
    handlerCalls = 0;
    const response = await POST(request("/api/auth/sign-out"));
    expect(response.status).toBe(200);
    expect(handlerCalls).toBe(1);
  });

  it("mantém /api/auth/admin/* com 404", async () => {
    impersonated = false;
    handlerCalls = 0;
    const response = await POST(request("/api/auth/admin/set-role"));
    expect(response.status).toBe(404);
    expect(handlerCalls).toBe(0);
  });

  it("permite credenciais em sessão normal", async () => {
    impersonated = false;
    handlerCalls = 0;
    const response = await POST(request("/api/auth/passkey/add-passkey"));
    expect(response.status).toBe(200);
    expect(handlerCalls).toBe(1);
  });
});
