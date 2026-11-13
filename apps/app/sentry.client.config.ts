import * as Sentry from "@sentry/nextjs";

import {
  BROWSER_EXTENSION_URL_PATTERNS,
  installBrowserExtensionErrorGuard,
  isSentryBrowserExtensionEvent,
} from "./src/lib/browser-extension-error";

// Register capture-phase extension error guards before Sentry and Next.js attach
// their global error / unhandledrejection handlers.
installBrowserExtensionErrorGuard();

const SENSITIVE_KEYS_REGEX =
  /pass(word|phrase)?|secret|token|api[_-]?key|auth(orization)?|credit[_-]?card|cvv|cookie|session/i;

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://701eae11ff84f3405b299c851146adb1@o4511768401018880.ingest.us.sentry.io/4512411126988800",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  denyUrls: BROWSER_EXTENSION_URL_PATTERNS,

  beforeSend(event, hint) {
    if (isSentryBrowserExtensionEvent(event, hint?.originalException)) {
      return null;
    }
    return event;
  },

  // Sanitize and filter logs before dispatching
  beforeSendLog: (log) => {
    // Drop trace and debug logs in production
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

  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*\.openministry\.online/,
    /^\//,
  ],
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // Forward browser console warnings and errors into Sentry Structured Logs
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
    Sentry.captureConsoleIntegration({
      levels: ["error", "warn"],
    }),
  ],
  debug: false,
});
