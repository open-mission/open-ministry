# Datadog Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument OpenMinistry with Datadog RUM, Next.js server traces, and server-side error logs without requiring Vercel Pro.

**Architecture:** Browser RUM is initialized in `instrumentation-client.ts` with the Datadog Next.js plugin and reports App Router errors from error boundaries. Server tracing uses `@vercel/otel` with a direct OTLP exporter to Datadog's Vercel-managed intake. Server errors are posted to the Datadog Logs API. Both server paths no-op when `DD_API_KEY` is absent, and every intake call is bounded and failure-tolerant.

**Tech Stack:** Next.js 16.4.5 App Router, React 19, TypeScript, Bun tests, `@datadog/browser-rum` 7.17.0, `@datadog/browser-rum-nextjs` 7.17.0 (Preview), `@vercel/otel` 2.3.0, OpenTelemetry JS 1.9 / 2.12 / 0.223.

**Spec:** `docs/superpowers/specs/2026-11-09-datadog-observability-design.md`

## Global Constraints

- Server telemetry runs only when `process.env.NEXT_RUNTIME === "nodejs"`. Edge instrumentation must skip silently.
- Missing `DD_API_KEY` means no trace export and no log export. It must never throw or block a request.
- RUM: `sessionSampleRate: 100`, `sessionReplaySampleRate: 20`, `defaultPrivacyLevel: "mask-user-input"`.
- RUM user identification: `datadogRum.setUser({ id })` only. Never send email, name, or other profile fields.
- RUM-to-APM tracing: same-origin URLs only, `propagatorTypes: ["tracecontext"]`.
- Never log request headers, cookies, authorization values, request bodies, or query-string secrets. Only path and method.
- Datadog defaults: site `datadoghq.com`, service `openministry`.
- Datadog OTLP traces endpoint is `https://vercel.integrations.otlp.datadoghq.com/v1/traces`.
- Datadog Logs API endpoint is `https://http-intake.logs.<site>/api/v2/logs` with the `DD-API-KEY` header.
- All intake calls use a 2-second timeout and swallow failures. Telemetry must never break a request.
- Vercel Hobby cannot use Trace Drains or Log Drains. Do not add Marketplace/Drain configuration.
- Stage only files named in each task. Leave `.agents/`, `skills-lock.json`, `vercel-optimize-report.md`, and `.env.local` untracked.
- Commit messages follow Conventional Commits. Work stays on `feature/datadog-observability`.

## Review Focus

- A request header contains `cookie` or `authorization`: the Datadog log must not include either value. Tested in Task 4.
- A request path contains a query string: only the path is logged, and the query string is dropped. Tested in Task 4.
- `DD_API_KEY` is absent in production: RUM still initializes, server tracing/logging no-op, and no request crashes. Tested in Tasks 2-4.
- The Datadog intake is down: the request still completes because failures are swallowed, and the call is bounded by a 2-second timeout. Tested in Task 4.
- A same-origin API call versus a third-party call: only the same-origin call is eligible for `traceparent` injection. Tested in Task 2.
- `onRequestError` receives a non-`Error` value: a log entry is still produced without throwing. Tested in Task 4.
- The site is `datadoghq.eu` or `us3.datadoghq.com`: logs go to the matching intake host. Tested in Task 2.

---

### Task 1: Dependencies and Environment Foundation

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `.env.example`
- Modify: `.env.local` (gitignored; public RUM values only)
- Delete: `src/datadogRUM-init.js` (untracked draft with hardcoded credentials)

**Interfaces:**
- Produces: installed packages used by Tasks 2-8, and documented environment variable names.
- Produces: `@datadog/browser-rum-nextjs@7.17.0` which exports `nextjsPlugin`, `onRouterTransitionStart`, `DatadogAppRouter`, and `addNextjsError`.

- [ ] **Step 1: Add the Datadog and OpenTelemetry dependencies**

Run:

```bash
bun add --exact \
  @datadog/browser-rum-nextjs@7.17.0 \
  @vercel/otel@2.3.0 \
  @opentelemetry/api@1.9.0 \
  @opentelemetry/api-logs@0.223.1 \
  @opentelemetry/instrumentation@0.223.1 \
  @opentelemetry/resources@2.12.1 \
  @opentelemetry/sdk-logs@0.223.1 \
  @opentelemetry/sdk-metrics@2.12.1 \
  @opentelemetry/sdk-trace-base@2.12.1
```

- [ ] **Step 2: Remove the direct React plugin dependency**

Run:

```bash
bun remove @datadog/browser-rum-react
```

`@datadog/browser-rum-nextjs` already depends on `@datadog/browser-rum-react@7.17.0`, so the package remains available transitively.

- [ ] **Step 3: Verify the installed versions**

Run:

```bash
node -e 'const p=require("./package.json"); for (const name of ["@datadog/browser-rum","@datadog/browser-rum-nextjs","@vercel/otel","@opentelemetry/api","@opentelemetry/sdk-trace-base"]) console.log(name, p.dependencies[name])'
```

Expected: `@datadog/browser-rum-nextjs 7.17.0`, `@vercel/otel 2.3.0`, `@opentelemetry/api 1.9.0`, `@opentelemetry/sdk-trace-base 2.12.1`. `@datadog/browser-rum` remains `^7.17.0`.

- [ ] **Step 4: Document the environment variables**

Append to `.env.example`:

```bash
# ---------------------------------------------------------------------------
# Datadog (RUM, APM e logs de erro)
# ---------------------------------------------------------------------------
# RUM: valores públicos embutidos no bundle do navegador
NEXT_PUBLIC_DD_APPLICATION_ID=
NEXT_PUBLIC_DD_CLIENT_TOKEN=
NEXT_PUBLIC_DD_SITE=datadoghq.com
NEXT_PUBLIC_DD_SERVICE=openministry

# APM e logs: somente servidor. Sem DD_API_KEY, a telemetria fica desligada.
DD_API_KEY=
DD_SITE=datadoghq.com
DD_SERVICE=openministry
```

- [ ] **Step 5: Add the public RUM values to `.env.local`**

Append only if the keys are not already present. Preserve existing content and do not print the file.

```bash
NEXT_PUBLIC_DD_APPLICATION_ID=474f4b0d-a70f-4fec-95b6-38d5cb824520
NEXT_PUBLIC_DD_CLIENT_TOKEN=pub11e902df43d94e2d7ffeac9ebc25a5e9
NEXT_PUBLIC_DD_SITE=datadoghq.com
NEXT_PUBLIC_DD_SERVICE=openministry
DD_SITE=datadoghq.com
DD_SERVICE=openministry
```

Leave `DD_API_KEY` absent until the user creates the key in Datadog.

- [ ] **Step 6: Delete the unused draft**

Run:

```bash
rm -f src/datadogRUM-init.js
```

- [ ] **Step 7: Verify the project still lints and typechecks**

Run:

```bash
bun run lint
bun run typecheck
```

Expected: both exit 0. No source file imports the new packages yet.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock .env.example
git commit -m "chore: add Datadog and OpenTelemetry dependencies"
```

- [ ] **Step 9: Commit the design and plan documents**

```bash
git add docs/superpowers/specs/2026-11-09-datadog-observability-design.md docs/superpowers/plans/2026-11-09-datadog-observability.md
git commit -m "docs: add Datadog observability design and plan"
```

---

### Task 2: Shared Datadog Configuration

**Files:**
- Create: `src/lib/datadog/config.ts`
- Test: `src/lib/datadog/__tests__/config.test.ts`

**Interfaces:**
- Produces: `DEFAULT_DD_SITE: string`, `DEFAULT_DD_SERVICE: string`
- Produces: `type RumConfig = { applicationId: string; clientToken: string; site: string; service: string; env: string; version: string }`
- Produces: `type ServerConfig = { apiKey: string; site: string; service: string; env: string; version: string }`
- Produces: `getRumConfig(): RumConfig | null`
- Produces: `getServerConfig(): ServerConfig | null`
- Produces: `getLogsEndpoint(site: string): string`
- Produces: `isSameOrigin(url: string, origin: string): boolean`
- Produces: `getRumInitOptions(config: RumConfig, origin: string): Omit<RumInitConfiguration, "plugins">`

- [ ] **Step 1: Write the failing test**

Create `src/lib/datadog/__tests__/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  DEFAULT_DD_SERVICE,
  DEFAULT_DD_SITE,
  getLogsEndpoint,
  getRumConfig,
  getRumInitOptions,
  getServerConfig,
  isSameOrigin,
} from "@/lib/datadog/config";
import { APP_VERSION } from "@/lib/version";

const MANAGED_KEYS = [
  "NEXT_PUBLIC_DD_APPLICATION_ID",
  "NEXT_PUBLIC_DD_CLIENT_TOKEN",
  "NEXT_PUBLIC_DD_SITE",
  "NEXT_PUBLIC_DD_SERVICE",
  "NEXT_PUBLIC_VERCEL_ENV",
  "DD_API_KEY",
  "DD_SITE",
  "DD_SERVICE",
  "VERCEL_ENV",
] as const;

const original = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of MANAGED_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getRumConfig", () => {
  it("returns null when the application id or client token is missing", () => {
    expect(getRumConfig()).toBeNull();

    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "app-id";
    expect(getRumConfig()).toBeNull();

    delete process.env.NEXT_PUBLIC_DD_APPLICATION_ID;
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "client-token";
    expect(getRumConfig()).toBeNull();
  });

  it("applies defaults and reads the deployment environment", () => {
    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "app-id";
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "client-token";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(getRumConfig()).toEqual({
      applicationId: "app-id",
      clientToken: "client-token",
      site: DEFAULT_DD_SITE,
      service: DEFAULT_DD_SERVICE,
      env: "preview",
      version: APP_VERSION,
    });
  });
});

describe("getServerConfig", () => {
  it("returns null without DD_API_KEY", () => {
    expect(getServerConfig()).toBeNull();
  });

  it("reads server overrides and falls back to the public service", () => {
    process.env.DD_API_KEY = "api-key";
    process.env.DD_SITE = "datadoghq.eu";
    process.env.NEXT_PUBLIC_DD_SERVICE = "openministry-web";
    process.env.VERCEL_ENV = "production";

    expect(getServerConfig()).toEqual({
      apiKey: "api-key",
      site: "datadoghq.eu",
      service: "openministry-web",
      env: "production",
      version: APP_VERSION,
    });
  });
});

describe("getLogsEndpoint", () => {
  it("builds the intake URL for each Datadog site", () => {
    expect(getLogsEndpoint("datadoghq.com")).toBe(
      "https://http-intake.logs.datadoghq.com/api/v2/logs",
    );
    expect(getLogsEndpoint("datadoghq.eu")).toBe(
      "https://http-intake.logs.datadoghq.eu/api/v2/logs",
    );
    expect(getLogsEndpoint("us3.datadoghq.com")).toBe(
      "https://http-intake.logs.us3.datadoghq.com/api/v2/logs",
    );
  });

  it("normalizes a site that includes a protocol or trailing slash", () => {
    expect(getLogsEndpoint("https://datadoghq.com/")).toBe(
      "https://http-intake.logs.datadoghq.com/api/v2/logs",
    );
  });
});

describe("isSameOrigin", () => {
  it("only matches the configured origin", () => {
    expect(
      isSameOrigin("https://openministry.app/api/x", "https://openministry.app"),
    ).toBe(true);
    expect(
      isSameOrigin("https://evil.example/api/x", "https://openministry.app"),
    ).toBe(false);
    expect(isSameOrigin("not a url", "https://openministry.app")).toBe(false);
  });
});

describe("getRumInitOptions", () => {
  it("pins sampling, privacy, and trace propagation", () => {
    const config = {
      applicationId: "app-id",
      clientToken: "client-token",
      site: "datadoghq.com",
      service: "openministry",
      env: "test",
      version: "0.9.4",
    };

    const options = getRumInitOptions(config, "https://openministry.app");

    expect(options.applicationId).toBe("app-id");
    expect(options.clientToken).toBe("client-token");
    expect(options.site).toBe("datadoghq.com");
    expect(options.service).toBe("openministry");
    expect(options.env).toBe("test");
    expect(options.version).toBe("0.9.4");
    expect(options.sessionSampleRate).toBe(100);
    expect(options.sessionReplaySampleRate).toBe(20);
    expect(options.defaultPrivacyLevel).toBe("mask-user-input");
    expect(options.trackResources).toBe(true);
    expect(options.trackUserInteractions).toBe(true);
    expect(options.trackLongTasks).toBe(true);

    const tracing = options.allowedTracingUrls?.[0] as {
      match: (url: string) => boolean;
      propagatorTypes: string[];
    };

    expect(tracing.propagatorTypes).toEqual(["tracecontext"]);
    expect(tracing.match("https://openministry.app/api/x")).toBe(true);
    expect(tracing.match("https://evil.example/api/x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/config.test.ts
```

Expected: FAIL with a module-not-found error for `@/lib/datadog/config`.

- [ ] **Step 3: Implement `src/lib/datadog/config.ts`**

Implement these exact exports. Use static `process.env.NEXT_PUBLIC_*` property accesses so Next.js can inline them into the client bundle. Do not destructure `process.env`.

```ts
import type { RumInitConfiguration } from "@datadog/browser-rum";

import { APP_VERSION } from "@/lib/version";

export const DEFAULT_DD_SITE = "datadoghq.com";
export const DEFAULT_DD_SERVICE = "openministry";

const RUM_SESSION_SAMPLE_RATE = 100;
const RUM_SESSION_REPLAY_SAMPLE_RATE = 20;
const RUM_DEFAULT_PRIVACY_LEVEL = "mask-user-input";

export type RumConfig = {
  applicationId: string;
  clientToken: string;
  site: string;
  service: string;
  env: string;
  version: string;
};

export type ServerConfig = {
  apiKey: string;
  site: string;
  service: string;
  env: string;
  version: string;
};

export function getRumConfig(): RumConfig | null
export function getServerConfig(): ServerConfig | null
export function getLogsEndpoint(site: string): string
export function isSameOrigin(url: string, origin: string): boolean
export function getRumInitOptions(
  config: RumConfig,
  origin: string,
): Omit<RumInitConfiguration, "plugins">
```

Behavior:
- `getRumConfig` returns `null` if `NEXT_PUBLIC_DD_APPLICATION_ID` or `NEXT_PUBLIC_DD_CLIENT_TOKEN` is missing or blank. `site` defaults to `DEFAULT_DD_SITE`; `service` defaults to `DEFAULT_DD_SERVICE`; `env` is `NEXT_PUBLIC_VERCEL_ENV`, then `VERCEL_ENV`, then `NODE_ENV`, then `"development"`; `version` is `APP_VERSION`.
- `getServerConfig` returns `null` if `DD_API_KEY` is missing or blank. `site` is `DD_SITE` or `DEFAULT_DD_SITE`; `service` is `DD_SERVICE`, then `NEXT_PUBLIC_DD_SERVICE`, then `DEFAULT_DD_SERVICE`; `env` is `VERCEL_ENV`, then `NODE_ENV`, then `"development"`; `version` is `APP_VERSION`.
- `getLogsEndpoint` strips an optional `http://`/`https://` prefix and trailing slashes from the site, then returns `https://http-intake.logs.<site>/api/v2/logs`.
- `isSameOrigin` parses both values with `new URL` and compares `.origin`; return `false` on any parse failure.
- `getRumInitOptions` returns `{ ...config, sessionSampleRate, sessionReplaySampleRate, trackResources: true, trackUserInteractions: true, trackLongTasks: true, defaultPrivacyLevel, allowedTracingUrls: [{ match: (url) => isSameOrigin(url, origin), propagatorTypes: ["tracecontext"] }] }`.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datadog/config.ts src/lib/datadog/__tests__/config.test.ts
git commit -m "feat: add Datadog configuration helpers"
```

---

### Task 3: OTLP Trace Exporter Configuration

**Files:**
- Create: `src/lib/datadog/otel.ts`
- Test: `src/lib/datadog/__tests__/otel.test.ts`

**Interfaces:**
- Consumes: `getServerConfig(): ServerConfig | null` from Task 2.
- Produces: `DATADOG_OTLP_TRACES_ENDPOINT: string`
- Produces: `type OtelExporterEnv = { OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: string; OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: string; OTEL_EXPORTER_OTLP_TRACES_HEADERS: string }`
- Produces: `getOtelExporterEnv(config: Pick<ServerConfig, "apiKey">): OtelExporterEnv`
- Produces: `configureOtelExporterEnv(): OtelExporterEnv | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/datadog/__tests__/otel.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  DATADOG_OTLP_TRACES_ENDPOINT,
  configureOtelExporterEnv,
  getOtelExporterEnv,
} from "@/lib/datadog/otel";

const MANAGED_KEYS = [
  "DD_API_KEY",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
] as const;

const original = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of MANAGED_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getOtelExporterEnv", () => {
  it("targets the Vercel-managed Datadog OTLP intake", () => {
    expect(getOtelExporterEnv({ apiKey: "secret" })).toEqual({
      OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: DATADOG_OTLP_TRACES_ENDPOINT,
      OTEL_EXPORTER_OTLP_TRACES_HEADERS:
        "dd-api-key=secret,compute_stats=true",
    });
  });
});

describe("configureOtelExporterEnv", () => {
  it("does nothing when DD_API_KEY is missing", () => {
    expect(configureOtelExporterEnv()).toBeNull();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBeUndefined();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS).toBeUndefined();
  });

  it("sets the exporter environment when DD_API_KEY exists", () => {
    process.env.DD_API_KEY = "secret";

    const env = configureOtelExporterEnv();

    expect(env).not.toBeNull();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL).toBe(
      "http/protobuf",
    );
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe(
      DATADOG_OTLP_TRACES_ENDPOINT,
    );
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS).toBe(
      "dd-api-key=secret,compute_stats=true",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/otel.test.ts
```

Expected: FAIL with a module-not-found error for `@/lib/datadog/otel`.

- [ ] **Step 3: Implement `src/lib/datadog/otel.ts`**

```ts
import "server-only";

import { getServerConfig, type ServerConfig } from "./config";

export const DATADOG_OTLP_TRACES_ENDPOINT =
  "https://vercel.integrations.otlp.datadoghq.com/v1/traces";

export type OtelExporterEnv = {
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: string;
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: string;
};

export function getOtelExporterEnv(
  config: Pick<ServerConfig, "apiKey">,
): OtelExporterEnv
export function configureOtelExporterEnv(): OtelExporterEnv | null
```

Behavior:
- `getOtelExporterEnv` returns `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf"`, the constant endpoint, and `OTEL_EXPORTER_OTLP_TRACES_HEADERS: "dd-api-key=<apiKey>,compute_stats=true"`.
- `configureOtelExporterEnv` calls `getServerConfig()`. If it returns `null`, return `null` without touching `process.env`. Otherwise assign the three variables with `Object.assign(process.env, env)` and return the env object.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/otel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datadog/otel.ts src/lib/datadog/__tests__/otel.test.ts
git commit -m "feat: configure Datadog OTLP trace export"
```

---

### Task 4: Server Error Logging

**Files:**
- Create: `src/lib/datadog/server.ts`
- Test: `src/lib/datadog/__tests__/server.test.ts`

**Interfaces:**
- Consumes: `getLogsEndpoint(site)`, `getServerConfig()`, `type ServerConfig` from Task 2.
- Produces: `type ServerLogLevel = "info" | "warn" | "error"`
- Produces: `type ServerLogRequest = { path: string; method: string; headers?: Record<string, string | string[] | undefined> }`
- Produces: `type ServerLogContext = { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string; revalidateReason?: string; renderType?: string }`
- Produces: `type ServerLogEvent = { level?: ServerLogLevel; message: string; error?: unknown; request?: ServerLogRequest; context?: ServerLogContext; attributes?: Record<string, string | number | boolean | undefined> }`
- Produces: `type NormalizedError = { kind: string; message: string; stack?: string; digest?: string }`
- Produces: `normalizeError(error: unknown): NormalizedError`
- Produces: `buildLogEntry(event: ServerLogEvent, config: ServerConfig): Record<string, unknown>`
- Produces: `logServerEvent(event: ServerLogEvent): Promise<void>`
- Produces: `logServerError(error: unknown, request: ServerLogRequest, context: ServerLogContext): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/datadog/__tests__/server.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/server.test.ts
```

Expected: FAIL with a module-not-found error for `@/lib/datadog/server`.

- [ ] **Step 3: Implement `src/lib/datadog/server.ts`**

```ts
import "server-only";

import {
  getLogsEndpoint,
  getServerConfig,
  type ServerConfig,
} from "./config";

export type ServerLogLevel = "info" | "warn" | "error";

export type ServerLogRequest = {
  path: string;
  method: string;
  headers?: Record<string, string | string[] | undefined>;
};

export type ServerLogContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  revalidateReason?: string;
  renderType?: string;
};

export type ServerLogEvent = {
  level?: ServerLogLevel;
  message: string;
  error?: unknown;
  request?: ServerLogRequest;
  context?: ServerLogContext;
  attributes?: Record<string, string | number | boolean | undefined>;
};

export type NormalizedError = {
  kind: string;
  message: string;
  stack?: string;
  digest?: string;
};

export function normalizeError(error: unknown): NormalizedError
export function buildLogEntry(
  event: ServerLogEvent,
  config: ServerConfig,
): Record<string, unknown>
export async function logServerEvent(event: ServerLogEvent): Promise<void>
export async function logServerError(
  error: unknown,
  request: ServerLogRequest,
  context: ServerLogContext,
): Promise<void>
```

Behavior:
- `normalizeError`: for `Error` instances, return `{ kind: error.name || "Error", message: error.message || "Unknown error", stack: error.stack, digest }`, where `digest` is included only when the error has a `digest` property and it is not `undefined`/`null`. For all other values, return `{ kind: "UnknownError", message: String(error) }`.
- `buildLogEntry`: return an object with `message`, `ddsource: "nodejs"`, `service`, `env`, `version`, `ddtags: "service:<service>,env:<env>,version:<version>"`, and `status` from `event.level ?? "info"`. Add `error: normalizeError(event.error)` only when `event.error !== undefined`. Add `request: { path: stripQueryString(event.request.path), method }` only (never headers). `stripQueryString` removes everything from the first `?` or `#` onward. Add `next: event.context` only when present. Add `attributes` with `undefined` values removed, and only when at least one key remains.
- `logServerEvent`: call `getServerConfig()`; return immediately if `null`. POST `JSON.stringify([buildLogEntry(event, config)])` to `getLogsEndpoint(config.site)` with `Content-Type: application/json`, `DD-API-KEY: config.apiKey`, `signal: AbortSignal.timeout(2000)`, and `cache: "no-store"`. Wrap the whole call in `try/catch`; on failure call `console.warn("[datadog] failed to send log", error)` and return. If the response is not ok, call `console.warn` with the status and return.
- `logServerError`: normalize the error, then call `logServerEvent({ level: "error", message: normalized.message, error, request, context })`.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
bun test --preload ./src/test/setup.ts src/lib/datadog/__tests__/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datadog/server.ts src/lib/datadog/__tests__/server.test.ts
git commit -m "feat: add Datadog server error logging"
```

---

### Task 5: Next.js Server Instrumentation

**Files:**
- Create: `src/instrumentation.ts`

**Interfaces:**
- Consumes: `configureOtelExporterEnv()` from Task 3.
- Consumes: `getServerConfig()` from Task 2.
- Consumes: `logServerError()` from Task 4.
- Produces: Next.js `register()` and `onRequestError` exports.

- [ ] **Step 1: Create `src/instrumentation.ts`**

```ts
import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { configureOtelExporterEnv } = await import("@/lib/datadog/otel");
    const exporterEnv = configureOtelExporterEnv();
    if (!exporterEnv) return;

    const { getServerConfig } = await import("@/lib/datadog/config");
    const config = getServerConfig();
    if (!config) return;

    const { registerOTel } = await import("@vercel/otel");
    registerOTel({
      serviceName: config.service,
      flushTimeoutMillis: 2000,
    });
  } catch (error) {
    console.warn("[datadog] failed to initialize tracing", error);
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { logServerError } = await import("@/lib/datadog/server");
    await logServerError(error, request, context);
  } catch (logError) {
    console.warn("[datadog] failed to report request error", logError);
  }
};
```

The dynamic imports are deliberate: the edge runtime must not evaluate Node-only packages, and tracing must not load when `DD_API_KEY` is absent.

- [ ] **Step 2: Verify types and lint**

Run:

```bash
bun run typecheck
bun run lint
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat: wire Datadog tracing and error logging into instrumentation"
```

---

### Task 6: Browser RUM Initialization

**Files:**
- Create: `src/instrumentation-client.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `getRumConfig()`, `getRumInitOptions()` from Task 2.
- Produces: initialized RUM SDK, `onRouterTransitionStart` export, and `<DatadogAppRouter />` in the root layout.

- [ ] **Step 1: Create `src/instrumentation-client.ts`**

```ts
import { datadogRum } from "@datadog/browser-rum";
import {
  nextjsPlugin,
  onRouterTransitionStart,
} from "@datadog/browser-rum-nextjs";

import { getRumConfig, getRumInitOptions } from "@/lib/datadog/config";

const config = getRumConfig();

if (typeof window !== "undefined" && config) {
  datadogRum.init({
    ...getRumInitOptions(config, window.location.origin),
    plugins: [nextjsPlugin()],
  });
}

export { onRouterTransitionStart };
```

- [ ] **Step 2: Render the App Router bridge in the root layout**

In `src/app/layout.tsx`, add the import:

```tsx
import { DatadogAppRouter } from "@datadog/browser-rum-nextjs";
```

Then render it as the first child of `<body>`:

```tsx
<body>
  <DatadogAppRouter />
  <Suspense fallback={null}>
    <UploadThingSSR />
  </Suspense>
  {/* existing providers and children stay unchanged */}
</body>
```

- [ ] **Step 3: Verify types and lint**

Run:

```bash
bun run typecheck
bun run lint
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/instrumentation-client.ts src/app/layout.tsx
git commit -m "feat: initialize Datadog RUM in the browser"
```

---

### Task 7: Authenticated User Identification

**Files:**
- Create: `src/components/app/datadog-user.tsx`
- Create: `src/components/app/datadog-user-loader.tsx`
- Modify: `src/app/(app)/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `getSession()` from `src/lib/session.ts`.
- Produces: `<DatadogUserLoader />`, a server component that renders `<DatadogUser userId={session.user.id} />` for authenticated sessions and `null` otherwise.

- [ ] **Step 1: Create the client component**

Create `src/components/app/datadog-user.tsx`:

```tsx
"use client";

import { datadogRum } from "@datadog/browser-rum";
import { useEffect } from "react";

export function DatadogUser({ userId }: { userId: string }) {
  useEffect(() => {
    if (!datadogRum.getInitConfiguration()) return;

    datadogRum.setUser({ id: userId });

    return () => {
      if (datadogRum.getInitConfiguration()) {
        datadogRum.clearUser();
      }
    };
  }, [userId]);

  return null;
}
```

Only the internal user ID is sent. Do not add email, name, or other profile fields.

- [ ] **Step 2: Create the server loader**

Create `src/components/app/datadog-user-loader.tsx`:

```tsx
import { getSession } from "@/lib/session";

import { DatadogUser } from "./datadog-user";

export async function DatadogUserLoader() {
  const session = await getSession();
  if (!session) return null;

  return <DatadogUser userId={session.user.id} />;
}
```

- [ ] **Step 3: Mount the loader in the dashboard layout**

In `src/app/(app)/dashboard/layout.tsx`, add the import:

```tsx
import { DatadogUserLoader } from "@/components/app/datadog-user-loader";
```

Add this block immediately after `<OfflineBanner />`:

```tsx
<Suspense fallback={null}>
  <DatadogUserLoader />
</Suspense>
```

The Suspense boundary is required because `getSession()` reads request headers.

- [ ] **Step 4: Verify types and lint**

Run:

```bash
bun run typecheck
bun run lint
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/datadog-user.tsx src/components/app/datadog-user-loader.tsx "src/app/(app)/dashboard/layout.tsx"
git commit -m "feat: identify authenticated users in Datadog RUM"
```

---

### Task 8: Error Boundaries

**Files:**
- Create: `src/components/app/route-error.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/(app)/dashboard/error.tsx`

**Interfaces:**
- Consumes: `datadogRum.getInitConfiguration()` and `addNextjsError` from `@datadog/browser-rum-nextjs`.
- Produces: reusable `<RouteError error reset />` and three Next.js error boundaries.

- [ ] **Step 1: Create the shared route error UI**

Create `src/components/app/route-error.tsx`:

```tsx
"use client";

import { datadogRum } from "@datadog/browser-rum";
import { addNextjsError } from "@datadog/browser-rum-nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (datadogRum.getInitConfiguration()) {
      addNextjsError(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algo deu errado
        </h1>
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar esta página. Tente novamente.
        </p>
      </div>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
```

The `getInitConfiguration()` guard prevents `addNextjsError` from queuing callbacks when RUM is disabled.

- [ ] **Step 2: Create the root route error boundary**

Create `src/app/error.tsx`:

```tsx
"use client";

import { RouteError } from "@/components/app/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
```

- [ ] **Step 3: Create the global error boundary**

Create `src/app/global-error.tsx`:

```tsx
"use client";

import { datadogRum } from "@datadog/browser-rum";
import { addNextjsError } from "@datadog/browser-rum-nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (datadogRum.getInitConfiguration()) {
      addNextjsError(error);
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8faf9",
          color: "#1f2933",
        }}
      >
        <main style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ marginBottom: 16, color: "#52606d" }}>
            Não foi possível carregar o OpenMinistry. Tente novamente.
          </p>
          <button
            onClick={reset}
            style={{
              borderRadius: 8,
              border: "1px solid #264a3a",
              background: "#264a3a",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 16px",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
```

`global-error.tsx` must provide its own `<html>` and `<body>` because it replaces the root layout.

- [ ] **Step 4: Create the dashboard error boundary**

Create `src/app/(app)/dashboard/error.tsx`:

```tsx
"use client";

import { RouteError } from "@/components/app/route-error";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
```

- [ ] **Step 5: Verify types and lint**

Run:

```bash
bun run typecheck
bun run lint
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/app/route-error.tsx src/app/error.tsx src/app/global-error.tsx "src/app/(app)/dashboard/error.tsx"
git commit -m "feat: report Next.js errors to Datadog RUM"
```

---

### Task 9: Datadog Documentation

**Files:**
- Create: `docs/datadog.md`

**Interfaces:**
- Produces: operator instructions for local setup, Vercel setup, verification, limitations, and disabling telemetry.

- [ ] **Step 1: Write `docs/datadog.md`**

Include these sections and exact values:

```markdown
# Datadog no OpenMinistry

## O que está instrumentado

- RUM no navegador: sessões, views, recursos, interações, long tasks e session replay em 20% das sessões.
- APM no servidor: traces do Next.js (rotas, renderização e fetch) via OpenTelemetry.
- Logs de erro do servidor: erros capturados por `onRequestError` e eventos críticos via `logServerEvent`.

## Arquitetura

O projeto está no plano Hobby da Vercel, que não permite Trace Drains nem Log Drains. Por isso a telemetria vai direto para a Datadog:

- Traces: `https://vercel.integrations.otlp.datadoghq.com/v1/traces`
- Logs: `https://http-intake.logs.datadoghq.com/api/v2/logs`

Se o projeto migrar para a Vercel Pro, os Drains oficiais podem substituir o export direto sem mudar a instrumentação da aplicação.

## Variáveis de ambiente

| Variável | Onde | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_DD_APPLICATION_ID` | Cliente | ID da aplicação RUM |
| `NEXT_PUBLIC_DD_CLIENT_TOKEN` | Cliente | Client token público do RUM |
| `NEXT_PUBLIC_DD_SITE` | Cliente | `datadoghq.com` |
| `NEXT_PUBLIC_DD_SERVICE` | Cliente | `openministry` |
| `DD_API_KEY` | Servidor (segredo) | API key criada na Datadog |
| `DD_SITE` | Servidor | `datadoghq.com` |
| `DD_SERVICE` | Servidor | `openministry` |

## Configuração local

1. Preencha as variáveis `NEXT_PUBLIC_DD_*` no `.env.local`.
2. Crie uma API key em **Organization Settings > API Keys** na Datadog.
3. Adicione `DD_API_KEY=<chave>` ao `.env.local`.
4. Rode `bun dev`.

Sem `DD_API_KEY`, o RUM continua funcionando e o tracing/logs do servidor ficam desligados.

## Configuração na Vercel

Adicione as mesmas variáveis em **Production** e **Preview**. Marque `DD_API_KEY` como sensível. As variáveis `NEXT_PUBLIC_*` são embutidas no bundle durante o build, então é necessário um novo deploy para aplicá-las.

## Verificação

- RUM: abra o app e confira sessões no **RUM Explorer**. O session replay aparece em 20% das sessões.
- RUM para APM: em uma chamada same-origin, o header `traceparent` deve aparecer na aba Network.
- APM: em **APM > Services**, procure o serviço `openministry`.
- Logs: provoque um erro de servidor e busque `service:openministry status:error` no **Log Explorer**.

## Limitações

- Logs de build, CDN e o stdout completo de todas as funções exigem Vercel Pro + Log Drain.
- Trace Drain oficial exige Vercel Pro.
- Não há dashboards ou monitores criados por este trabalho.

## Privacidade

- Session replay usa `mask-user-input`.
- A identificação do usuário envia somente o ID interno (`setUser({ id })`), sem e-mail ou nome.
- Logs de erro enviam apenas o caminho (sem query string) e o método da requisição, nunca headers, cookies, authorization ou corpo.

## Desligar

Remova `NEXT_PUBLIC_DD_APPLICATION_ID`/`NEXT_PUBLIC_DD_CLIENT_TOKEN` para desligar o RUM. Remova `DD_API_KEY` para desligar traces e logs do servidor. Nenhum caminho lança erro quando as variáveis estão ausentes.
```

- [ ] **Step 2: Verify the document renders and commands are correct**

Run:

```bash
sed -n '1,200p' docs/datadog.md
```

Expected: the file contains all sections above and no placeholder text.

- [ ] **Step 3: Commit**

```bash
git add docs/datadog.md
git commit -m "docs: document Datadog observability setup"
```

---

### Task 10: Final Verification and Merge

**Files:**
- No new source files.

**Interfaces:**
- Consumes: all previous tasks.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
bun run test
```

Expected: all tests pass, including `src/lib/datadog/__tests__/config.test.ts`, `otel.test.ts`, and `server.test.ts`.

- [ ] **Step 2: Run lint, typecheck, and build**

Run:

```bash
bun run lint
bun run typecheck
bun run build
```

Expected: all exit 0. Fix any failures before continuing.

- [ ] **Step 3: Check for hardcoded RUM values outside the design docs**

Run:

```bash
git grep -n "474f4b0d-a70f-4fec-95b6-38d5cb824520" -- . ':!docs/superpowers' || true
git grep -n "pub11e902df43d94e2d7ffeac9ebc25a5e9" -- . ':!docs/superpowers' || true
```

Expected: no output. The RUM values live only in `.env.local`, which is gitignored.

- [ ] **Step 4: Configure the public Vercel environment variables**

Run these commands only if the Vercel CLI is authenticated for the `openmission/openministry` project. They add public RUM values to Production and Preview:

```bash
vercel env add NEXT_PUBLIC_DD_APPLICATION_ID --environment production,preview --value "474f4b0d-a70f-4fec-95b6-38d5cb824520" --no-sensitive --yes
vercel env add NEXT_PUBLIC_DD_CLIENT_TOKEN --environment production,preview --value "pub11e902df43d94e2d7ffeac9ebc25a5e9" --no-sensitive --yes
vercel env add NEXT_PUBLIC_DD_SITE --environment production,preview --value "datadoghq.com" --no-sensitive --yes
vercel env add NEXT_PUBLIC_DD_SERVICE --environment production,preview --value "openministry" --no-sensitive --yes
vercel env add DD_SITE --environment production,preview --value "datadoghq.com" --no-sensitive --yes
vercel env add DD_SERVICE --environment production,preview --value "openministry" --no-sensitive --yes
```

Verify:

```bash
vercel env ls | grep -E "NEXT_PUBLIC_DD_|DD_SITE|DD_SERVICE"
```

Expected: each variable appears for Production and Preview. If a variable already exists, add `--force` to the corresponding command. Do not add `DD_API_KEY` here; the user must create it in Datadog first.

- [ ] **Step 5: Run the optional smoke tests**

If `DD_API_KEY` exists in `.env.local`, run `bun dev` and verify:

1. RUM requests appear in the browser Network tab and in the Datadog RUM Explorer.
2. A same-origin request contains the `traceparent` header.
3. A temporary server error appears in the Datadog Log Explorer with `service:openministry status:error`.
4. The `openministry` service appears in Datadog APM.

To produce a deterministic server error, create and then remove a temporary route handler:

```bash
mkdir -p src/app/api/datadog-smoke
cat > src/app/api/datadog-smoke/route.ts <<'EOF'
export function GET() {
  throw new Error("datadog smoke test");
}
EOF
curl -i http://localhost:3000/api/datadog-smoke
rm -rf src/app/api/datadog-smoke
```

If `DD_API_KEY` is absent, record: "APM and log smoke tests blocked until `DD_API_KEY` is created." Do not invent success.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git status --short
git diff --stat develop...HEAD
```

Expected: only the files from Tasks 1-9 are tracked in the branch diff. `.agents/`, `skills-lock.json`, `vercel-optimize-report.md`, and `.env.local` remain untracked or unstaged.

- [ ] **Step 7: Merge into `develop` with `--no-ff`**

Run:

```bash
git checkout develop
git merge --no-ff feature/datadog-observability -m "merge: feature/datadog-observability into develop"
git branch -d feature/datadog-observability
```

- [ ] **Step 8: Confirm the merge**

Run:

```bash
git log --oneline -3
git status --short
```

Expected: the merge commit is at the top of `develop`, and the feature branch is gone.

---

## Completion Checklist

- [ ] All ten tasks committed with Conventional Commit messages.
- [ ] `bun run test`, `bun run lint`, `bun run typecheck`, and `bun run build` pass.
- [ ] No hardcoded Datadog RUM values in source files, and no `DD_API_KEY` value in any tracked file.
- [ ] RUM, APM, and log paths are instrumented as specified.
- [ ] `DD_API_KEY` is documented as the only manual prerequisite for APM/log smoke tests.
- [ ] Branch merged into `develop` with `--no-ff` and deleted.
