import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { configureOtelExporterEnv } = await import("@/lib/datadog/otel");
    const exporterEnv = configureOtelExporterEnv();
    if (!exporterEnv) return;

    const { getServerConfig } = await import("@/lib/datadog/config");
    const config = getServerConfig();
    if (!config) return;

    const { registerOTel } = await import("@vercel/otel");
    registerOTel({
      serviceName: config.service,
      flushTimeoutMillis: 2000,
    });
  } catch (error) {
    console.warn("[datadog] failed to initialize tracing", error);
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { logServerError } = await import("@/lib/datadog/server");
    await logServerError(error, request, context);
  } catch (logError) {
    console.warn("[datadog] failed to report request error", logError);
  }
};
