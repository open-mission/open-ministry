import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("next/server", () => ({
  connection: async () => undefined,
}));

type MockContext = {
  session: { user: { id: string } };
  organization: { id: string };
  isAdmin: boolean;
} | null;

let mockContext: MockContext = null;
let mockCanRead = false;
let mockDepartments = [
  { id: "dep-1", name: "Louvor", description: null, canCreate: true },
  { id: "dep-2", name: "Mídia", description: "Equipe de mídia", canCreate: false },
];
let mockRehearsals: Array<Record<string, unknown>> = [];
const listCalls: Array<{ organizationId: string; departmentIds: string[] }> = [];

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => mockContext,
}));

mock.module("@/lib/permissions/service", () => ({
  can: async () => mockCanRead,
}));

mock.module("@/features/rehearsals/services/rehearsals-global-service", () => ({
  getAccessibleRehearsalDepartments: async () => mockDepartments,
  listAccessibleRehearsals: async (
    organizationId: string,
    departmentIds: string[],
  ) => {
    listCalls.push({ organizationId, departmentIds });
    return mockRehearsals;
  },
}));

const { GET } = await import("@/app/api/rehearsals/route");

function request(search = "") {
  return {
    nextUrl: new URL(`https://app.test/api/rehearsals${search}`),
  } as never;
}

beforeEach(() => {
  listCalls.length = 0;
  mockContext = {
    session: { user: { id: "user-1" } },
    organization: { id: "org-1" },
    isAdmin: false,
  };
  mockCanRead = true;
  mockDepartments = [
    { id: "dep-1", name: "Louvor", description: null, canCreate: true },
    { id: "dep-2", name: "Mídia", description: "Equipe de mídia", canCreate: false },
  ];
  mockRehearsals = [
    { id: "event-1", title: "Ensaio de Louvor", songs: [], departments: [] },
  ];
});

describe("GET /api/rehearsals", () => {
  it("responde 401 sem sessão", async () => {
    mockContext = null;

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listCalls.length).toBe(0);
  });

  it("responde 403 sem permissão global de leitura", async () => {
    mockCanRead = false;

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(listCalls.length).toBe(0);
  });

  it("responde 403 para departmentId não autorizado", async () => {
    const response = await GET(request("?departmentId=dep-9"));

    expect(response.status).toBe(403);
    expect(listCalls.length).toBe(0);
  });

  it("lista ensaios e departamentos acessíveis", async () => {
    const response = await GET(request());
    const data = (await response.json()) as {
      rehearsals: unknown[];
      departments: unknown[];
    };

    expect(response.status).toBe(200);
    expect(listCalls).toEqual([
      { organizationId: "org-1", departmentIds: ["dep-1", "dep-2"] },
    ]);
    expect(data.rehearsals).toHaveLength(1);
    expect(data.departments).toEqual(mockDepartments);
  });

  it("filtra por departmentId autorizado", async () => {
    const response = await GET(request("?departmentId=dep-2"));
    const data = (await response.json()) as {
      rehearsals: unknown[];
      departments: unknown[];
    };

    expect(response.status).toBe(200);
    expect(listCalls).toEqual([
      { organizationId: "org-1", departmentIds: ["dep-2"] },
    ]);
    expect(data.departments).toEqual(mockDepartments);
  });
});
