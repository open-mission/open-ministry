import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import type { ServerConfig } from "@/lib/datadog/config";
import {
  buildLogEntry,
  logServerError,
  logServerEvent,
  normalizeError,
  type ServerLogEvent,
} from "@/lib/datadog/server";

const config: ServerConfig = {
  apiKey: "secret",
  site: "datadoghq.com",
  service: "openministry",
  env: "test",
  version: "0.9.4",
};

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.DD_API_KEY;
const originalSite = process.env.DD_SITE;
const originalService = process.env.DD_SERVICE;
const originalPublicService = process.env.NEXT_PUBLIC_DD_SERVICE;

beforeEach(() => {
  process.env.DD_API_KEY = "secret";
  delete process.env.DD_SITE;
  delete process.env.DD_SERVICE;
  delete process.env.NEXT_PUBLIC_DD_SERVICE;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.DD_API_KEY;
  else process.env.DD_API_KEY = originalApiKey;
  if (originalSite === undefined) delete process.env.DD_SITE;
  else process.env.DD_SITE = originalSite;
  if (originalService === undefined) delete process.env.DD_SERVICE;
  else process.env.DD_SERVICE = originalService;
  if (originalPublicService === undefined) delete process.env.NEXT_PUBLIC_DD_SERVICE;
  else process.env.NEXT_PUBLIC_DD_SERVICE = originalPublicService;
});

describe("normalizeError", () => {
  it("keeps name, message, stack, and digest", () => {
    const error = Object.assign(new TypeError("boom"), { digest: "abc" });
    const normalized = normalizeError(error);

    expect(normalized).toMatchObject({
      kind: "TypeError",
      message: "boom",
      digest: "abc",
    });
    expect(normalized.stack).toContain("boom");
  });

  it("handles non-Error values", () => {
    expect(normalizeError("plain failure")).toEqual({
      kind: "UnknownError",
      message: "plain failure",
    });
    expect(normalizeError({ code: 42 })).toEqual({
      kind: "UnknownError",
      message: "[object Object]",
    });
  });
});

describe("buildLogEntry", () => {
  it("includes error, request, and Next.js context without headers", () => {
    const event: ServerLogEvent = {
      level: "error",
      message: "Request failed",
      error: Object.assign(new Error("boom"), { digest: "digest-1" }),
      request: {
        path: "/api/churches?token=secret&x=1",
        method: "POST",
        headers: {
          cookie: "session=secret",
          authorization: "Bearer secret",
          "user-agent": "test",
        },
      },
      context: {
        routerKind: "App Router",
        routePath: "/api/churches",
        routeType: "route",
      },
      attributes: { job: "sync", attempt: 2, skipped: undefined },
    };

    const entry = buildLogEntry(event, config);

    expect(entry).toMatchObject({
      message: "Request failed",
      service: "openministry",
      env: "test",
      version: "0.9.4",
      status: "error",
      ddsource: "nodejs",
      ddtags: "service:openministry,env:test,version:0.9.4",
      request: { path: "/api/churches", method: "POST" },
      next: {
        routerKind: "App Router",
        routePath: "/api/churches",
        routeType: "route",
      },
      attributes: { job: "sync", attempt: 2 },
      error: { kind: "Error", message: "boom", digest: "digest-1" },
    });

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("session=secret");
    expect(serialized).not.toContain("Bearer secret");
    expect(serialized).not.toContain("token=secret");
  });
});

describe("logServerEvent", () => {
  it("does not call fetch without DD_API_KEY", async () => {
    delete process.env.DD_API_KEY;
    const fetchMock = mock(
      async (_url: string, _init?: RequestInit) => new Response("{}"),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await logServerEvent({ message: "noop" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a JSON array to the site-specific intake", async () => {
    const fetchMock = mock(
      async (_url: string, _init?: RequestInit) =>
        new Response("{}", { status: 202 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await logServerEvent({ level: "warn", message: "hello" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://http-intake.logs.datadoghq.com/api/v2/logs");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": "secret",
      },
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ message: "hello", status: "warn" });
  });

  it("swallows intake failures", async () => {
    globalThis.fetch = mock(
      async (_url: string, _init?: RequestInit) => {
        throw new Error("network down");
      },
    ) as unknown as typeof fetch;

    await expect(
      logServerEvent({ message: "hello" }),
    ).resolves.toBeUndefined();
  });

  it("swallows non-ok responses", async () => {
    globalThis.fetch = mock(
      async (_url: string, _init?: RequestInit) =>
        new Response("nope", { status: 500 }),
    ) as unknown as typeof fetch;

    await expect(
      logServerEvent({ message: "hello" }),
    ).resolves.toBeUndefined();
  });
});

describe("logServerError", () => {
  it("delegates to the log intake with error context", async () => {
    const fetchMock = mock(
      async (_url: string, _init?: RequestInit) =>
        new Response("{}", { status: 202 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await logServerError(
      new Error("boom"),
      { path: "/dashboard", method: "GET" },
      {
        routerKind: "App Router",
        routePath: "/dashboard",
        routeType: "render",
      },
    );

    const body = JSON.parse(
      String(fetchMock.mock.calls[0]![1]?.body),
    );
    expect(body[0]).toMatchObject({
      status: "error",
      message: "boom",
      request: { path: "/dashboard", method: "GET" },
      next: { routePath: "/dashboard" },
      error: { message: "boom" },
    });
  });

  it("logs non-Error values without throwing", async () => {
    const fetchMock = mock(
      async (_url: string, _init?: RequestInit) =>
        new Response("{}", { status: 202 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await logServerError("plain failure", { path: "/x", method: "GET" }, {});

    const body = JSON.parse(
      String(fetchMock.mock.calls[0]![1]?.body),
    );
    expect(body[0]).toMatchObject({
      status: "error",
      message: "plain failure",
      error: { kind: "UnknownError", message: "plain failure" },
    });
  });
});
