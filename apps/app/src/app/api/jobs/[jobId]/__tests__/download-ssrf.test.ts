import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const realFetch = globalThis.fetch;

let fileUrl: string | null = null;
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

function installMocks() {
  mock.module("server-only", () => ({}));
  mock.module("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async () => ({
          session: { activeOrganizationId: "org-1" },
          user: { id: "user-1" },
        }),
      },
    },
  }));
  mock.module("@/db", () => ({
    db: {
      query: {
        backgroundJob: {
          findFirst: async () => ({
            id: "job-1",
            organizationId: "org-1",
            status: "completed",
            result: {
              fileName: "cronograma.pdf",
              ...(fileUrl ? { fileUrl } : {}),
            },
          }),
        },
      },
    },
  }));
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    fetchCalls.push({ url, init });
    return new Response(new Uint8Array([37, 80, 68, 70]), {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  }) as typeof fetch;
}

installMocks();

const route = await import(
  `@/app/api/jobs/[jobId]/download/route?wave5=${Date.now()}`
);

function request() {
  return new Request("http://localhost/api/jobs/job-1/download");
}

function context() {
  return { params: Promise.resolve({ jobId: "job-1" }) };
}

beforeEach(() => {
  fileUrl = null;
  fetchCalls = [];
  installMocks();
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

describe("isAllowedUploadThingUrl", () => {
  it("aceita apenas HTTPS do domínio oficial do UploadThing", () => {
    const allowed = route.isAllowedUploadThingUrl;

    expect(allowed("https://abc123.ufs.sh/f/arquivo.pdf")).toBe(true);
    expect(allowed("https://utfs.io/f/arquivo.pdf")).toBe(true);
    expect(allowed("http://abc123.ufs.sh/f/arquivo.pdf")).toBe(false);
    expect(allowed("https://evil.com/abc.ufs.sh")).toBe(false);
    expect(allowed("https://evil.com/f/pdf")).toBe(false);
    expect(allowed("//evil.com/f/pdf")).toBe(false);
    expect(allowed("não é url")).toBe(false);
    expect(allowed("https://user:pass@abc123.ufs.sh/f.pdf")).toBe(false);
  });
});

describe("GET /api/jobs/[jobId]/download", () => {
  it("busca no servidor com redirect: error e devolve PDF como anexo", async () => {
    fileUrl = "https://abc123.ufs.sh/f/arquivo.pdf";

    const response = await route.GET(request() as never, context());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].init?.redirect).toBe("error");
    expect(fetchCalls[0].init?.cache).toBe("no-store");
  });

  it("bloqueia fileUrl fora do domínio antes de fazer fetch", async () => {
    fileUrl = "https://evil.com/arquivo.pdf";

    const response = await route.GET(request() as never, context());

    expect(response.status).toBe(400);
    expect(fetchCalls).toHaveLength(0);
  });
});
