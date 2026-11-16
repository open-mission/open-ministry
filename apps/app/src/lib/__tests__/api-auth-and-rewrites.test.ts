import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import * as nextServer from "next/server";

mock.module("next/server", () => ({
  ...nextServer,
  connection: async () => undefined,
}));

// Sem igreja ativa/sessão: a API deve responder 401 em vez de redirecionar.
mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => null,
  requireOrganizationContext: async () => {
    throw new Error("requireOrganizationContext não deve ser usada em /api");
  },
  listUserMemberships: async () => [],
}));

type RouteModule = {
  GET: (request: Request) => Promise<Response>;
};

type NextConfigSource = {
  source: string;
  destination: string;
};

const apiRoutes: Array<{ path: string; load: () => Promise<RouteModule> }> = [
  {
    path: "/api/songs",
    load: () =>
      import("@/app/api/songs/route") as unknown as Promise<RouteModule>,
  },
  {
    path: "/api/events",
    load: () =>
      import("@/app/api/events/route") as unknown as Promise<RouteModule>,
  },
  {
    path: "/api/departments",
    load: () =>
      import("@/app/api/departments/route") as unknown as Promise<RouteModule>,
  },
  {
    path: "/api/people",
    load: () =>
      import("@/app/api/people/route") as unknown as Promise<RouteModule>,
  },
];

describe("API routes without an active organization", () => {
  for (const route of apiRoutes) {
    it(`${route.path} responde 401 sem redirecionar`, async () => {
      const { GET } = await route.load();
      const response = await GET(
        new Request(`http://localhost${route.path}`) as never,
      );

      expect(response.status).toBe(401);
      expect(response.headers.get("location")).toBeNull();
      expect(await response.json()).toEqual({
        error: "Não autenticado ou nenhuma igreja ativa selecionada.",
      });
    });
  }
});

describe("next.config.ts rewrites", () => {
  const source = readFileSync(
    new URL("../../../next.config.ts", import.meta.url),
    "utf8",
  );

  it("não usa mais o padrão :path*", () => {
    expect(source).not.toContain(":path*");
  });

  it("usa :path+ em todas as rotas com subpath", () => {
    expect(source).toContain('{ source: "/events/:path+", destination: "/dashboard/events/:path+" }');
    expect(source).toContain('{ source: "/songs/:path+", destination: "/dashboard/songs/:path+" }');
    expect(source).toContain('{ source: "/members/:path+", destination: "/dashboard/members/:path+" }');
  });

  it("declara a rota exata antes da rota curinga", () => {
    const bases = [
      "events",
      "schedules",
      "members",
      "departments",
      "announcements",
      "songs",
      "whatsapp",
      "emails",
      "jobs",
      "settings",
      "profile",
      "church",
      "notifications",
    ];

    for (const base of bases) {
      const exactIndex = source.indexOf(`{ source: "/${base}", destination:`);
      const wildcardIndex = source.indexOf(
        `{ source: "/${base}/:path+", destination:`,
      );

      expect(exactIndex).toBeGreaterThan(-1);
      expect(wildcardIndex).toBeGreaterThan(exactIndex);
    }
  });

  it("mantém cada regra de rewrite com source e destination coerentes", () => {
    const rules = [
      ...source.matchAll(
        /\{ source: "([^"]+)", destination: "([^"]+)" \}/g,
      ),
    ].map((match) => ({ source: match[1], destination: match[2] })) as NextConfigSource[];

    expect(rules.length).toBeGreaterThan(20);
    for (const rule of rules) {
      expect(rule.destination).toBe(`/dashboard${rule.source}`);
    }
  });
});
