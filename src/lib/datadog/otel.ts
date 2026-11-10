import "server-only";

import { getServerConfig, type ServerConfig } from "./config";

export const DATADOG_OTLP_TRACES_ENDPOINT =
  "https://vercel.integrations.otlp.datadoghq.com/v1/traces";

export type OtelExporterEnv = {
  OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: string;
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: string;
};

export function getOtelExporterEnv(
  config: Pick<ServerConfig, "apiKey">,
): OtelExporterEnv {
  return {
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: DATADOG_OTLP_TRACES_ENDPOINT,
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: `dd-api-key=${config.apiKey},compute_stats=true`,
  };
}

export function configureOtelExporterEnv(): OtelExporterEnv | null {
  const config = getServerConfig();
  if (!config) return null;

  const env = getOtelExporterEnv(config);
  Object.assign(process.env, env);
  return env;
}
