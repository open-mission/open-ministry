import "server-only";

import {
  getLogsEndpoint,
  getServerConfig,
  type ServerConfig,
} from "./config";

const LOG_TIMEOUT_MS = 2000;

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

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const normalized: NormalizedError = {
      kind: error.name || "Error",
      message: error.message || "Unknown error",
      stack: error.stack,
    };

    const digest = (error as Error & { digest?: unknown }).digest;
    if (digest !== undefined && digest !== null) {
      normalized.digest = String(digest);
    }

    return normalized;
  }

  return {
    kind: "UnknownError",
    message: String(error),
  };
}

function stripQueryString(path: string): string {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");
  const cutIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);

  if (cutIndexes.length === 0) return path;

  return path.slice(0, Math.min(...cutIndexes));
}

function stripUndefined(
  attributes: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> | undefined {
  const cleaned: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function buildLogEntry(
  event: ServerLogEvent,
  config: ServerConfig,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    message: event.message,
    ddsource: "nodejs",
    service: config.service,
    env: config.env,
    version: config.version,
    ddtags: `service:${config.service},env:${config.env},version:${config.version}`,
    status: event.level ?? "info",
  };

  if (event.error !== undefined) {
    entry.error = normalizeError(event.error);
  }

  if (event.request) {
    entry.request = {
      path: stripQueryString(event.request.path),
      method: event.request.method,
    };
  }

  if (event.context) {
    entry.next = event.context;
  }

  if (event.attributes) {
    const attributes = stripUndefined(event.attributes);
    if (attributes) {
      entry.attributes = attributes;
    }
  }

  return entry;
}

export async function logServerEvent(event: ServerLogEvent): Promise<void> {
  const config = getServerConfig();
  if (!config) return;

  try {
    const response = await fetch(getLogsEndpoint(config.site), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": config.apiKey,
      },
      body: JSON.stringify([buildLogEntry(event, config)]),
      signal: AbortSignal.timeout(LOG_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[datadog] log intake responded with status ${response.status}`,
      );
    }
  } catch (error) {
    console.warn("[datadog] failed to send log", error);
  }
}

export async function logServerError(
  error: unknown,
  request: ServerLogRequest,
  context: ServerLogContext,
): Promise<void> {
  const normalized = normalizeError(error);

  await logServerEvent({
    level: "error",
    message: normalized.message,
    error,
    request,
    context,
  });
}
