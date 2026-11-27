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

type RedirectRule = {
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

describe("next.config.ts redirects", () => {
  const source = readFileSync(
    new URL("../../../next.config.ts", import.meta.url),
    "utf8",
  );
  const block = source.slice(
    source.indexOf("async redirects()"),
    source.indexOf("turbopack:"),
  );
  const rules = [
    ...block.matchAll(
      /\{\s*source: "([^"]+)",\s*destination: "([^"]+)",\s*permanent: true,?\s*\}/g,
    ),
  ].map((match) => ({
    source: match[1],
    destination: match[2],
  })) as RedirectRule[];

  it("substitui os rewrites por redirecionamentos e não usa :path*", () => {
    expect(source).not.toContain("async rewrites()");
    expect(block).not.toContain('destination: "/dashboard');
    expect(source).not.toContain(":path*");
  });

  it("mantém todas as regras como permanentes (308)", () => {
    expect(rules).toHaveLength(6);
    expect(block.match(/permanent: true/g)).toHaveLength(6);
    expect(rules.every((rule) => !rule.destination.startsWith("//"))).toBe(true);
  });

  it("declara as regras específicas antes dos curingas", () => {
    const indices = (fragment: string) => block.indexOf(fragment);

    expect(indices('source: "/dashboard"')).toBeGreaterThan(-1);
    expect(indices('source: "/dashboard/avisos"')).toBeGreaterThan(-1);
    expect(indices('source: "/avisos"')).toBeGreaterThan(-1);
    expect(indices('source: "/dashboard/events"')).toBeGreaterThan(
      indices('source: "/dashboard/avisos"'),
    );
    expect(indices('source: "/dashboard/:section')).toBeGreaterThan(
      indices('source: "/dashboard/events"'),
    );
    expect(indices('source: "/dashboard/:section([a-z0-9-]+)/:path+"')).toBeGreaterThan(
      indices('source: "/dashboard/:section([a-z0-9-]+)"'),
    );
  });

  it("restringe o primeiro segmento para evitar open redirect", () => {
    const withSection = rules.filter((rule) => rule.source.includes(":section"));

    expect(withSection).toHaveLength(2);
    for (const rule of withSection) {
      expect(rule.source).toContain(":section([a-z0-9-]+)");
      expect(rule.destination).toMatch(/^\/:section/);
    }
    expect(block).toContain('destination: "/:section"');
    expect(block).toContain('destination: "/:section/:path+"');
  });
});
