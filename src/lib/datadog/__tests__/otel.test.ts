import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  DATADOG_OTLP_TRACES_ENDPOINT,
  configureOtelExporterEnv,
  getOtelExporterEnv,
} from "@/lib/datadog/otel";

const MANAGED_KEYS = [
  "DD_API_KEY",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
] as const;

const original = new Map(MANAGED_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  for (const key of MANAGED_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getOtelExporterEnv", () => {
  it("targets the Vercel-managed Datadog OTLP intake", () => {
    expect(getOtelExporterEnv({ apiKey: "secret" })).toEqual({
      OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: DATADOG_OTLP_TRACES_ENDPOINT,
      OTEL_EXPORTER_OTLP_TRACES_HEADERS:
        "dd-api-key=secret,compute_stats=true",
    });
  });
});

describe("configureOtelExporterEnv", () => {
  it("does nothing when DD_API_KEY is missing", () => {
    expect(configureOtelExporterEnv()).toBeNull();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBeUndefined();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS).toBeUndefined();
  });

  it("sets the exporter environment when DD_API_KEY exists", () => {
    process.env.DD_API_KEY = "secret";

    const env = configureOtelExporterEnv();

    expect(env).not.toBeNull();
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL).toBe(
      "http/protobuf",
    );
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe(
      DATADOG_OTLP_TRACES_ENDPOINT,
    );
    expect(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS).toBe(
      "dd-api-key=secret,compute_stats=true",
    );
  });
});
