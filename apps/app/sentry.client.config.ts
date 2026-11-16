import * as Sentry from "@sentry/nextjs";

import {
  BROWSER_EXTENSION_URL_PATTERNS,
  installBrowserExtensionErrorGuard,
  isSentryBrowserExtensionEvent,
} from "./src/lib/browser-extension-error";
import {
  sanitizeSentryEvent,
  sanitizeSentryLog,
  sentryPrivacyOptions,
} from "./src/lib/telemetry/sanitize";

// Register capture-phase extension error guards before Sentry and Next.js attach
// their global error / unhandledrejection handlers.
installBrowserExtensionErrorGuard();

Sentry.init({
  ...sentryPrivacyOptions,
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://701eae11ff84f3405b299c851146adb1@o4511768401018880.ingest.us.sentry.io/4512411126988800",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  denyUrls: BROWSER_EXTENSION_URL_PATTERNS,
  // Nenhuma PII é enviada: beforeSend redige usuário, e-mails, IPs e tokens.
  beforeSend(event, hint) {
    if (isSentryBrowserExtensionEvent(event, hint?.originalException)) {
      return null;
    }
    return sanitizeSentryEvent(event);
  },

  // Sanitize and filter logs before dispatching
  beforeSendLog: (log) => sanitizeSentryLog(log),

  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*\.openministry\.online/,
    /^\//,
  ],
  integrations: [
    // Replays não podem capturar texto nem mídia dos membros.
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Forward browser console warnings and errors into Sentry Structured Logs
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
  ],
  debug: false,
});
