# Datadog Observability — Design

**Date:** 2026-11-09
**Status:** Approved
**Branch:** `feature/datadog-observability`

## Goal

Instrument OpenMinistry with Datadog so the team can analyze real user sessions, frontend performance, Next.js server traces, and server-side error logs.

## Constraint

The Vercel project is on the **Hobby** plan. Vercel Trace Drains and Log Drains are available only on Pro and Enterprise. The Datadog Marketplace integration therefore cannot forward platform traces or logs on Hobby.

The approved workaround is to export telemetry directly to Datadog's managed Vercel OTLP endpoint:

- Traces: `https://vercel.integrations.otlp.datadoghq.com/v1/traces`
- Logs: Datadog Logs API at `https://http-intake.logs.datadoghq.com/api/v2/logs`

This works on Hobby and uses the same Datadog organization and API key. If the project later moves to Pro, the direct export can be replaced by the official Trace Drain and Log Drain without changing the application-facing instrumentation.

## Scope

### 1. RUM (browser)

- Packages: `@datadog/browser-rum`, `@datadog/browser-rum-nextjs`.
- Initialize in `src/instrumentation-client.ts` with `nextjsPlugin()`.
- Re-export `onRouterTransitionStart` for App Router navigations.
- Render `<DatadogAppRouter />` in the root layout.
- Report Next.js error boundaries with `addNextjsError` in:
  - `src/app/global-error.tsx`
  - `src/app/error.tsx`
  - `src/app/(app)/dashboard/error.tsx`
- Sampling:
  - `sessionSampleRate: 100`
  - `sessionReplaySampleRate: 20`
- Privacy:
  - `defaultPrivacyLevel: "mask-user-input"`
  - `setUser({ id })` only; no name or email.
- Tracking: resources, user interactions, long tasks.
- RUM-to-APM correlation:
  - `allowedTracingUrls` matches same-origin URLs.
  - `propagatorTypes: ["tracecontext"]` because the backend uses OpenTelemetry/W3C trace context.
- Environment: `NEXT_PUBLIC_VERCEL_ENV ?? VERCEL_ENV ?? NODE_ENV ?? "development"`.
- Version: `APP_VERSION` from `src/lib/version.ts`.
- Service: `openministry`.

### 2. APM (server)

- Package: `@vercel/otel` plus compatible OpenTelemetry peer packages.
- `src/instrumentation.ts`:
  - `register()` runs only on the Node.js runtime.
  - If `DD_API_KEY` is missing, tracing is a no-op.
  - Configure the OTLP exporter through environment variables:
    - `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf`
    - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://vercel.integrations.otlp.datadoghq.com/v1/traces`
    - `OTEL_EXPORTER_OTLP_TRACES_HEADERS=dd-api-key=<key>,compute_stats=true`
  - Call `registerOTel({ serviceName, flushTimeoutMillis: 2000 })`.
- Next.js emits framework spans for routes, rendering, and fetch calls.
- Custom spans can be added later with `@opentelemetry/api`.
- `serviceName` is `DD_SERVICE ?? NEXT_PUBLIC_DD_SERVICE ?? "openministry"`.

### 3. Logs (server)

- `onRequestError` in `src/instrumentation.ts` sends a structured error log to the Datadog Logs API.
- Log payload includes:
  - message
  - error name, message, digest, stack
  - request path and method
  - `routerKind`, `routePath`, `routeType`
  - service, environment, version
- A `logServerEvent` helper is available for critical application events (jobs, webhooks).
- All intake calls catch failures; telemetry must never break a request.
- Limitation: build logs, CDN logs, and the full stdout of every function require Vercel Pro plus a Log Drain.

### 4. Configuration

Client-side (public):

- `NEXT_PUBLIC_DD_APPLICATION_ID`
- `NEXT_PUBLIC_DD_CLIENT_TOKEN`
- `NEXT_PUBLIC_DD_SITE` (default `datadoghq.com`)
- `NEXT_PUBLIC_DD_SERVICE` (default `openministry`)

Server-side:

- `DD_API_KEY` (secret)
- `DD_SITE` (default `datadoghq.com`)
- `DD_SERVICE` (default `openministry`)

`.env.example` documents all variables. `.env.local` holds real values and is gitignored. Vercel must have the same variables in Production and Preview.

### 5. Files

Create:

- `src/lib/datadog/config.ts`
- `src/lib/datadog/otel.ts`
- `src/lib/datadog/server.ts`
- `src/lib/datadog/__tests__/config.test.ts`
- `src/lib/datadog/__tests__/otel.test.ts`
- `src/lib/datadog/__tests__/server.test.ts`
- `src/instrumentation.ts`
- `src/instrumentation-client.ts`
- `src/components/app/datadog-user.tsx`
- `src/components/app/datadog-user-loader.tsx`
- `src/components/app/route-error.tsx`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/app/(app)/dashboard/error.tsx`
- `docs/datadog.md`

Modify:

- `package.json`
- `bun.lock`
- `.env.example`
- `src/app/layout.tsx`
- `src/app/(app)/dashboard/layout.tsx`

Delete:

- `src/datadogRUM-init.js` (unused draft with hardcoded credentials)

## Out of Scope

- Vercel Pro upgrade, Trace Drain, and Log Drain.
- Datadog dashboards and monitors.
- APM for external services (Neon, UploadThing, OneSignal) beyond automatic fetch spans.
- Full platform log collection.

## Verification

- `bun test`
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- Local smoke test:
  - RUM events appear in the Datadog RUM Explorer.
  - Same-origin requests contain `traceparent` in the Network tab.
  - An intentional server error appears in the Datadog Log Explorer.
- APM and log smoke tests require a valid `DD_API_KEY`.
