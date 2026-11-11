import * as Sentry from "@sentry/nextjs";

/**
 * Structured Telemetry & Sentry Logging utility for OpenMinistry.
 * Implements Sentry Structured Logs (Sentry.logger), distributed tracing,
 * isolation scopes, wide events, and metric collection across client, server, and edge.
 */

const SENSITIVE_KEYS_REGEX =
  /pass(word|phrase)?|secret|token|api[_-]?key|auth(orization)?|credit[_-]?card|cvv|cookie|session/i;

export type SentryLogAttributes = Record<string, string | number | boolean>;

/**
 * Normalizes and sanitizes attributes for Sentry Structured Logs.
 * Sentry Logs strictly accepts string | number | boolean primitives.
 * Sensitive keys are automatically redacted.
 */
export function sanitizeLogAttributes(
  context?: Record<string, unknown>,
): SentryLogAttributes {
  if (!context || typeof context !== "object") return {};

  const sanitized: SentryLogAttributes = {};

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null) continue;

    if (SENSITIVE_KEYS_REGEX.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (value instanceof Error) {
      sanitized[key] = `${value.name}: ${value.message}`;
    } else {
      try {
        sanitized[key] = JSON.stringify(value);
      } catch {
        sanitized[key] = String(value);
      }
    }
  }

  return sanitized;
}

/**
 * Native Sentry Structured Logger (`Sentry.logger.*`).
 * Dispatches structured, queryable logs to the Sentry Logs platform
 * correlated with distributed traces and session replays.
 */
export const sentryLogger = {
  /**
   * Ultra-granular execution tracing (typically filtered in production).
   */
  trace(message: string, attributes?: Record<string, unknown>) {
    const cleanAttrs = sanitizeLogAttributes(attributes);
    Sentry.logger.trace(message, cleanAttrs);
  },

  /**
   * Development diagnostics, internal state, cache hits/misses.
   */
  debug(message: string, attributes?: Record<string, unknown>) {
    const cleanAttrs = sanitizeLogAttributes(attributes);
    Sentry.logger.debug(message, cleanAttrs);
  },

  /**
   * Normal business milestones, user actions, confirmed transactions.
   */
  info(message: string, attributes?: Record<string, unknown>) {
    const cleanAttrs = sanitizeLogAttributes(attributes);
    Sentry.logger.info(message, cleanAttrs);
  },

  /**
   * Degraded state, approaching quota/rate limits, recoverable warnings.
   */
  warn(message: string, attributes?: Record<string, unknown>) {
    const cleanAttrs = sanitizeLogAttributes(attributes);
    Sentry.logger.warn(message, cleanAttrs);
  },

  /**
   * Failure requiring investigation. Logs to Sentry Logs.
   */
  error(errorOrMessage: Error | string, attributes?: Record<string, unknown>) {
    const message =
      typeof errorOrMessage === "string"
        ? errorOrMessage
        : `${errorOrMessage.name}: ${errorOrMessage.message}`;
    const cleanAttrs = sanitizeLogAttributes({
      ...(typeof errorOrMessage !== "string"
        ? { errorName: errorOrMessage.name, errorStack: errorOrMessage.stack }
        : {}),
      ...attributes,
    });
    Sentry.logger.error(message, cleanAttrs);
  },

  /**
   * Critical system failure or unrecoverable crash.
   */
  fatal(errorOrMessage: Error | string, attributes?: Record<string, unknown>) {
    const message =
      typeof errorOrMessage === "string"
        ? errorOrMessage
        : `${errorOrMessage.name}: ${errorOrMessage.message}`;
    const cleanAttrs = sanitizeLogAttributes({
      ...(typeof errorOrMessage !== "string"
        ? { errorName: errorOrMessage.name, errorStack: errorOrMessage.stack }
        : {}),
      ...attributes,
    });
    Sentry.logger.fatal(message, cleanAttrs);
  },

  /**
   * Tagged template literal for parameterizing message strings into searchable fields.
   * Example:
   *   sentryLogger.info(sentryLogger.fmt`User ${userId} created event ${eventId}`);
   */
  fmt: Sentry.logger.fmt,

  /**
   * Binds contextual attributes to the current request isolation scope.
   * Best practice for Server Actions and API route handlers to avoid cross-request data leaks.
   */
  setScopeContext(attributes: Record<string, unknown>) {
    const cleanAttrs = sanitizeLogAttributes(attributes);
    Sentry.getIsolationScope().setAttributes(cleanAttrs);
  },
};

/**
 * Wide Event logger following observability best practices:
 * Emits one rich, comprehensive log entry with full contextual state
 * instead of multiple fragmented, low-context logs.
 */
export function logWideEvent(
  eventName: string,
  eventData: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
) {
  const cleanAttrs = sanitizeLogAttributes({
    event: eventName,
    timestamp: new Date().toISOString(),
    ...eventData,
  });

  switch (level) {
    case "warn":
      Sentry.logger.warn(`[Event: ${eventName}]`, cleanAttrs);
      break;
    case "error":
      Sentry.logger.error(`[Event: ${eventName}]`, cleanAttrs);
      break;
    case "info":
    default:
      Sentry.logger.info(`[Event: ${eventName}]`, cleanAttrs);
      break;
  }

  // Also record a breadcrumb for automatic correlation in error reports
  Sentry.addBreadcrumb({
    category: "event",
    message: eventName,
    level: level === "warn" ? "warning" : level,
    data: cleanAttrs,
  });
}

/**
 * Unified Telemetry Facade for OpenMinistry:
 * Bridges Sentry Structured Logs, Breadcrumbs, Error Capture, and Metrics.
 */
export const telemetryLogger = {
  trace(message: string, context?: Record<string, unknown>) {
    sentryLogger.trace(message, context);
  },

  debug(message: string, context?: Record<string, unknown>) {
    sentryLogger.debug(message, context);
  },

  info(message: string, context?: Record<string, unknown>) {
    sentryLogger.info(message, context);
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
    sentryLogger.warn(message, context);
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
    sentryLogger.error(error, context);
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
      console.error(
        `[OpenMinistry:Error] ${error.message}`,
        error,
        context || "",
      );
    }
  },

  fatal(error: Error | string, context?: Record<string, unknown>) {
    sentryLogger.fatal(error, context);
    if (typeof error === "string") {
      Sentry.captureMessage(error, {
        level: "fatal",
        extra: context,
      });
    } else {
      Sentry.captureException(error, {
        level: "fatal",
        extra: context,
      });
    }
  },

  fmt: Sentry.logger.fmt,
  setScopeContext: sentryLogger.setScopeContext,
  wideEvent: logWideEvent,

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
        telemetryMetrics.distribution(
          "api.duration_ms",
          duration,
          "millisecond",
          {
            endpoint: name,
            status: "success",
            ...tags,
          },
        );
        sentryLogger.info(`API ${name} completed successfully`, {
          endpoint: name,
          durationMs: duration,
          status: "success",
          ...tags,
        });
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - start);
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : "error",
        });
        telemetryMetrics.distribution(
          "api.duration_ms",
          duration,
          "millisecond",
          {
            endpoint: name,
            status: "error",
            ...tags,
          },
        );
        telemetryMetrics.count("api.calls.errors", 1, { endpoint: name, ...tags });
        sentryLogger.error(error instanceof Error ? error : String(error), {
          endpoint: name,
          durationMs: duration,
          status: "error",
          ...tags,
        });
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
