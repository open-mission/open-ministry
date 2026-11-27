import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

mock.module("server-only", () => ({}));

let orgs: Array<{ id: string; members: Array<{ user: { id: string } }> }> = [];
let channels: Array<{ organizationId: string; organization: { name: string } }> = [];
let people: Array<{
  id: string;
  organizationId: string;
  userId: string | null;
  phone: string | null;
  name: string;
}> = [];
let moodWhere: SQL | undefined;
let moodQueryCalls = 0;
let personFindManyCalls = 0;
let personWhere: SQL | undefined;
let moodFindManyCalls = 0;

let activeDispatch = 0;
let maxDispatch = 0;
let dispatchCount = 0;

mock.module("@/lib/queue", () => ({
  verifyQueueEndpointAuth: async () => ({ ok: true }),
  getRedisClient: () => null,
}));

mock.module("@/lib/push-notifications", () => ({
  sendWebPushToUser: async () => ({ sentCount: 1, errors: 0 }),
}));

mock.module("@/lib/notification-service", () => ({
  dispatchNotification: async () => {
    dispatchCount++;
    activeDispatch++;
    maxDispatch = Math.max(maxDispatch, activeDispatch);
    await Promise.resolve();
    activeDispatch--;
  },
}));

mock.module("@/lib/telemetry/sentry", () => ({
  sentryLogger: {
    setScopeContext: () => {},
    error: () => {},
    info: () => {},
    fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
      String.raw({ raw: strings }, ...values),
  },
}));

mock.module("@/db", () => ({
  db: {
    query: {
      organization: {
        findMany: async () => orgs,
      },
      organizationNotificationChannel: {
        findMany: async () => channels,
      },
      person: {
        findMany: async (args: { where?: SQL }) => {
          personFindManyCalls++;
          personWhere = args?.where;
          return people;
        },
      },
      personMood: {
        findMany: async () => {
          moodFindManyCalls++;
          return [];
        },
      },
    },
    select: () => ({
      from: () => ({
        where: (where: SQL) => {
          moodQueryCalls++;
          moodWhere = where;
          return Promise.resolve([
            { organizationId: "org-1", userId: "u-1" },
          ]);
        },
      }),
    }),
  },
}));

const { POST: felicitometroPost } = await import(
  "@/app/api/jobs/felicitometro-prompt/route"
);
const { POST: availabilityPost } = await import(
  "@/app/api/jobs/monthly-availability/route"
);

function request(): Request {
  return new Request("http://localhost/api/jobs/test", {
    method: "POST",
    body: "{}",
  });
}

beforeEach(() => {
  orgs = [];
  channels = [];
  people = [];
  moodWhere = undefined;
  personWhere = undefined;
  moodQueryCalls = 0;
  personFindManyCalls = 0;
  moodFindManyCalls = 0;
  activeDispatch = 0;
  maxDispatch = 0;
  dispatchCount = 0;
});

describe("felicitometro-prompt — leitura em lote", () => {
  it("faz uma única consulta de humores para todas as organizações", async () => {
    orgs = [
      {
        id: "org-1",
        members: [{ user: { id: "u-1" } }, { user: { id: "u-2" } }],
      },
      {
        id: "org-2",
        members: [{ user: { id: "u-3" } }],
      },
    ];

    const response = await felicitometroPost(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      totalTargeted: 2,
      totalPushSent: 2,
    });
    expect(moodQueryCalls).toBe(1);
    expect(moodFindManyCalls).toBe(0);
    expect(moodWhere).toBeDefined();

    const query = new PgDialect().sqlToQuery(moodWhere!);
    expect(query.sql).toContain('"organization_id" in');
    expect(query.sql).toContain('"created_at" >=');
  });
});

describe("monthly-availability — leitura em lote e concorrência limitada", () => {
  it("busca pessoas uma vez e despacha em lotes de no máximo 10", async () => {
    channels = [
      { organizationId: "org-1", organization: { name: "Igreja A" } },
      { organizationId: "org-2", organization: { name: "Igreja B" } },
    ];
    people = Array.from({ length: 25 }, (_, index) => ({
      id: `p-${index}`,
      organizationId: index % 2 === 0 ? "org-1" : "org-2",
      userId: `u-${index}`,
      phone: index === 0 ? null : "5511999999999",
      name: `Pessoa ${index}`,
    }));

    const response = await availabilityPost(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, totalDispatched: 24 });
    expect(personFindManyCalls).toBe(1);
    expect(personWhere).toBeDefined();

    const query = new PgDialect().sqlToQuery(personWhere!);
    expect(query.sql).toContain('"organization_id" in');
    expect(dispatchCount).toBe(24);
    expect(maxDispatch).toBeLessThanOrEqual(10);
    expect(maxDispatch).toBeGreaterThan(1);
  });
});
