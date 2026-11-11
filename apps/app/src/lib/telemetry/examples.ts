/**
 * Sentry Logging Best Practices & Code Examples for OpenMinistry.
 *
 * This file demonstrates standard patterns for instrumenting structured logs
 * using Sentry SDK v11 and @openministry/app telemetry utilities.
 */

import {
  logWideEvent,
  sentryLogger,
  telemetryLogger,
  trackApiCall,
} from "./sentry";

// ============================================================================
// 1. STANDARD STRUCTURED LOGGING WITH QUERYABLE ATTRIBUTES
// ============================================================================
// Best Practice: Always attach key attributes (userId, eventId, role)
// Attribute values MUST be string, number, or boolean.
export function exampleBasicLogging(userId: string, eventId: string) {
  // Debug / Trace: Dev milestones (auto-filtered in production by beforeSendLog)
  sentryLogger.debug("Evaluating volunteer scheduling constraints", {
    userId,
    eventId,
    step: "conflict_check",
  });

  // Info: Important business milestones
  sentryLogger.info("Volunteer successfully assigned to service scale", {
    userId,
    eventId,
    role: "Vocal",
    confirmed: true,
  });

  // Warn: Recoverable state or approaching limits
  sentryLogger.warn("Volunteer assigned to multiple services on the same day", {
    userId,
    servicesCount: 2,
    threshold: 1,
  });
}

// ============================================================================
// 2. PARAMETERIZED TEMPLATE LOGGING (sentryLogger.fmt)
// ============================================================================
// Best Practice: Use tagged template literal `fmt` to create human-readable
// log messages that are simultaneously indexed as discrete parameters in Sentry.
export function exampleParameterizedLogging(
  senderName: string,
  recipientCount: number,
  channel: "whatsapp" | "email",
) {
  sentryLogger.info(
    sentryLogger.fmt`${senderName} broadcasted notification to ${recipientCount} recipients via ${channel}`,
    {
      channel,
      recipientCount,
      senderName,
    },
  );
}

// ============================================================================
// 3. WIDE EVENTS PATTERN (Observability Best Practice)
// ============================================================================
// Best Practice: Prefer ONE comprehensive log with complete context at the end
// of a business transaction rather than multiple fragmented log lines.
export function exampleWideEvent(
  orderId: string,
  churchId: string,
  userId: string,
  stats: { volunteerCount: number; durationMs: number },
) {
  logWideEvent("scale.published", {
    orderId,
    churchId,
    userId,
    volunteersScheduled: stats.volunteerCount,
    executionTimeMs: stats.durationMs,
    environment: process.env.NODE_ENV,
    status: "published",
  });
}

// ============================================================================
// 4. SERVER ACTIONS & REQUEST ISOLATION SCOPE
// ============================================================================
// Best Practice: Bind request-level context (action, user, church) to the
// isolation scope at the start of a Server Action or API Route handler.
export async function exampleServerActionLogging(
  organizationId: string,
  userId: string,
) {
  // Bind per-request attributes without cross-request leakage
  sentryLogger.setScopeContext({
    action: "publishMonthlyScaleAction",
    organizationId,
    userId,
  });

  try {
    sentryLogger.info("Monthly scale generation started", {
      month: "2026-12",
      targetChurch: organizationId,
    });

    // ... business logic ...

    sentryLogger.info("Monthly scale successfully committed", {
      status: "success",
    });
  } catch (error) {
    // Automatically sanitizes error and attaches stack/name
    sentryLogger.error(error instanceof Error ? error : String(error), {
      phase: "publish_monthly_scale",
    });
    throw error;
  }
}

// ============================================================================
// 5. DISTRIBUTED API TRACING WITH METRICS & ERROR LOGGING
// ============================================================================
// Best Practice: Wrap critical third-party network calls with trackApiCall
// for automated duration distribution metrics, span tracing, and Sentry logging.
export async function exampleApiTracing() {
  return trackApiCall(
    "evolution.send_message",
    async () => {
      // Simulate external API call
      return { success: true };
    },
    { provider: "evolution_go", priority: "high" },
  );
}

// ============================================================================
// 6. BACKWARD COMPATIBLE TELEMETRY FACADE
// ============================================================================
export function exampleTelemetryFacade() {
  telemetryLogger.info("Member checked in at Sunday service", {
    serviceName: "Culto da Família",
    attendees: 180,
  });
}
