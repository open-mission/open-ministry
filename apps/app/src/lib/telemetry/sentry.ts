import * as Sentry from "@sentry/nextjs";

/**
 * Structured Telemetry & Sentry tracking utility for OpenMinistry.
 * Provides unified logging, error capture, distributed metrics, and API tracing.
 */

export const telemetryLogger = {
  info(message: string, context?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
      category: "app.info",
      message,
      level: "info",
      data: context,
    });
    if (process.env.NODE_ENV !== "production") {
      console.info(`[OpenMinistry:Info] ${message}`, context || "");
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    Sentry.addBreadcrumb({
      category: "app.warn",
      message,
      level: "warning",
      data: context,
    });
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[OpenMinistry:Warn] ${message}`, context || "");
    }
  },

  error(error: Error | string, context?: Record<string, unknown>) {
    if (typeof error === "string") {
      Sentry.captureMessage(error, {
        level: "error",
        extra: context,
      });
      console.error(`[OpenMinistry:Error] ${error}`, context || "");
    } else {
      Sentry.captureException(error, {
        extra: context,
      });
      console.error(`[OpenMinistry:Error] ${error.message}`, error, context || "");
    }
  },

  metric(
    name: string,
    value: number,
    unit: string = "none",
    tags?: Record<string, string | number>,
  ) {
    if (Sentry.metrics?.distribution) {
      Sentry.metrics.distribution(name, value, {
        unit: unit as never,
        attributes: tags,
      });
    }
  },
};

export const telemetryMetrics = {
  count(name: string, value: number = 1, tags?: Record<string, string | number>) {
    if (Sentry.metrics?.count) {
      Sentry.metrics.count(name, value, {
        attributes: tags,
      });
    }
  },

  distribution(
    name: string,
    value: number,
    unit: string = "millisecond",
    tags?: Record<string, string | number>,
  ) {
    if (Sentry.metrics?.distribution) {
      Sentry.metrics.distribution(name, value, {
        unit: unit as never,
        attributes: tags,
      });
    }
  },

  gauge(name: string, value: number, tags?: Record<string, string | number>) {
    if (Sentry.metrics?.gauge) {
      Sentry.metrics.gauge(name, value, {
        attributes: tags,
      });
    }
  },
};

/**
 * Traces an asynchronous API call, measures duration, records metrics and handles errors.
 */
export async function trackApiCall<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const start = performance.now();
  telemetryMetrics.count("api.calls.total", 1, { endpoint: name, ...tags });

  return Sentry.startSpan(
    {
      name: `API ${name}`,
      op: "http.client",
      attributes: tags,
    },
    async (span) => {
      try {
        const result = await fn();
        const duration = Math.round(performance.now() - start);
        span.setStatus({ code: 1, message: "ok" });
        telemetryMetrics.distribution("api.duration_ms", duration, "millisecond", {
          endpoint: name,
          status: "success",
          ...tags,
        });
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - start);
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : "error" });
        telemetryMetrics.distribution("api.duration_ms", duration, "millisecond", {
          endpoint: name,
          status: "error",
          ...tags,
        });
        telemetryMetrics.count("api.calls.errors", 1, { endpoint: name, ...tags });
        Sentry.captureException(error, {
          extra: { endpoint: name, durationMs: duration, ...tags },
        });
        throw error;
      }
    },
  );
}

/**
 * Sets the active user in Sentry for issue tracking and session attribution.
 */
export function setSentryUser(user: {
  id: string;
  email?: string | null;
  name?: string | null;
  churchId?: string | null;
} | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: user.name || undefined,
    churchId: user.churchId || undefined,
  });
}
