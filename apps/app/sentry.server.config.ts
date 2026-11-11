import * as Sentry from "@sentry/nextjs";

const SENSITIVE_KEYS_REGEX =
  /pass(word|phrase)?|secret|token|api[_-]?key|auth(orization)?|credit[_-]?card|cvv|cookie|session/i;

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://701eae11ff84f3405b299c851146adb1@o4511768401018880.ingest.us.sentry.io/4512411126988800",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Sanitize and filter logs before dispatching
  beforeSendLog: (log) => {
    // Drop trace and debug logs in production to optimize quota & noise
    if (
      process.env.NODE_ENV === "production" &&
      (log.level === "trace" || log.level === "debug")
    ) {
      return null;
    }

    // Scrub sensitive keys from structured attributes
    if (log.attributes && typeof log.attributes === "object") {
      for (const key of Object.keys(log.attributes)) {
        if (SENSITIVE_KEYS_REGEX.test(key)) {
          log.attributes[key] = "[REDACTED]";
        }
      }
    }

    return log;
  },

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
