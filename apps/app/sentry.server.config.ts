import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://701eae11ff84f3405b299c851146adb1@o4511768401018880.ingest.us.sentry.io/4512411126988800",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  integrations: [
    Sentry.nodeRuntimeMetricsIntegration(),
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
    Sentry.zodErrorsIntegration(),
    Sentry.extraErrorDataIntegration({ depth: 5 }),
  ],
  debug: false,
});
