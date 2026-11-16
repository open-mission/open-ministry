import * as Sentry from "@sentry/nextjs";

import {
  sanitizeSentryEvent,
  sanitizeSentryLog,
  sentryPrivacyOptions,
} from "./src/lib/telemetry/sanitize";

Sentry.init({
  ...sentryPrivacyOptions,
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://701eae11ff84f3405b299c851146adb1@o4511768401018880.ingest.us.sentry.io/4512411126988800",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  // Nenhuma PII é enviada: beforeSend redige usuário, e-mails, IPs e tokens.
  beforeSend: (event) => sanitizeSentryEvent(event),

  // Sanitize and filter logs before dispatching
  beforeSendLog: (log) => sanitizeSentryLog(log),

  integrations: [
    Sentry.nodeRuntimeMetricsIntegration(),
    // Forward server console calls into Sentry Structured Logs
    Sentry.consoleLoggingIntegration({
      levels: ["log", "info", "warn", "error"],
    }),
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
    Sentry.zodErrorsIntegration(),
    Sentry.extraErrorDataIntegration({ depth: 5 }),
  ],
  debug: false,
});
