import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  DEFAULT_DD_SERVICE,
  DEFAULT_DD_SITE,
  getLogsEndpoint,
  getRumConfig,
  getRumInitOptions,
  getServerConfig,
  isSameOrigin,
} from "@/lib/datadog/config";
import { APP_VERSION } from "@/lib/version";

const MANAGED_KEYS = [
  "NEXT_PUBLIC_DD_APPLICATION_ID",
  "NEXT_PUBLIC_DD_CLIENT_TOKEN",
  "NEXT_PUBLIC_DD_SITE",
  "NEXT_PUBLIC_DD_SERVICE",
  "NEXT_PUBLIC_VERCEL_ENV",
  "DD_API_KEY",
  "DD_SITE",
  "DD_SERVICE",
  "VERCEL_ENV",
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

describe("getRumConfig", () => {
  it("returns null when the application id or client token is missing", () => {
    expect(getRumConfig()).toBeNull();

    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "app-id";
    expect(getRumConfig()).toBeNull();

    delete process.env.NEXT_PUBLIC_DD_APPLICATION_ID;
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "client-token";
    expect(getRumConfig()).toBeNull();
  });

  it("applies defaults and reads the deployment environment", () => {
    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "app-id";
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "client-token";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(getRumConfig()).toEqual({
      applicationId: "app-id",
      clientToken: "client-token",
      site: DEFAULT_DD_SITE,
      service: DEFAULT_DD_SERVICE,
      env: "preview",
      version: APP_VERSION,
    });
  });

  it("treats whitespace-only values as missing", () => {
    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "   ";
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "  ";
    expect(getRumConfig()).toBeNull();

    process.env.NEXT_PUBLIC_DD_APPLICATION_ID = "app-id";
    process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN = "client-token";
    process.env.NEXT_PUBLIC_DD_SITE = "   ";
    process.env.NEXT_PUBLIC_DD_SERVICE = "\t";

    expect(getRumConfig()).toMatchObject({
      site: DEFAULT_DD_SITE,
      service: DEFAULT_DD_SERVICE,
    });
  });
});

describe("getServerConfig", () => {
  it("returns null without DD_API_KEY", () => {
    expect(getServerConfig()).toBeNull();
  });

  it("treats a whitespace-only DD_API_KEY as missing", () => {
    process.env.DD_API_KEY = "   ";
    expect(getServerConfig()).toBeNull();
  });

  it("reads server overrides and falls back to the public service", () => {
    process.env.DD_API_KEY = "api-key";
    process.env.DD_SITE = "datadoghq.eu";
    process.env.NEXT_PUBLIC_DD_SERVICE = "openministry-web";
    process.env.VERCEL_ENV = "production";

    expect(getServerConfig()).toEqual({
      apiKey: "api-key",
      site: "datadoghq.eu",
      service: "openministry-web",
      env: "production",
      version: APP_VERSION,
    });
  });
});

describe("getLogsEndpoint", () => {
  it("builds the intake URL for each Datadog site", () => {
    expect(getLogsEndpoint("datadoghq.com")).toBe(
      "https://http-intake.logs.datadoghq.com/api/v2/logs",
    );
    expect(getLogsEndpoint("datadoghq.eu")).toBe(
      "https://http-intake.logs.datadoghq.eu/api/v2/logs",
    );
    expect(getLogsEndpoint("us3.datadoghq.com")).toBe(
      "https://http-intake.logs.us3.datadoghq.com/api/v2/logs",
    );
  });

  it("normalizes a site that includes a protocol or trailing slash", () => {
    expect(getLogsEndpoint("https://datadoghq.com/")).toBe(
      "https://http-intake.logs.datadoghq.com/api/v2/logs",
    );
  });
});

describe("isSameOrigin", () => {
  it("only matches the configured origin", () => {
    expect(
      isSameOrigin("https://openministry.app/api/x", "https://openministry.app"),
    ).toBe(true);
    expect(
      isSameOrigin("https://evil.example/api/x", "https://openministry.app"),
    ).toBe(false);
    expect(isSameOrigin("not a url", "https://openministry.app")).toBe(false);
  });
});

describe("getRumInitOptions", () => {
  it("pins sampling, privacy, and trace propagation", () => {
    const config = {
      applicationId: "app-id",
      clientToken: "client-token",
      site: "datadoghq.com",
      service: "openministry",
      env: "test",
      version: "0.9.4",
    };

    const options = getRumInitOptions(config, "https://openministry.app");

    expect(options.applicationId).toBe("app-id");
    expect(options.clientToken).toBe("client-token");
    expect(options.site).toBe("datadoghq.com");
    expect(options.service).toBe("openministry");
    expect(options.env).toBe("test");
    expect(options.version).toBe("0.9.4");
    expect(options.sessionSampleRate).toBe(100);
    expect(options.sessionReplaySampleRate).toBe(20);
    expect(options.defaultPrivacyLevel).toBe("mask-user-input");
    expect(options.trackResources).toBe(true);
    expect(options.trackUserInteractions).toBe(true);
    expect(options.trackLongTasks).toBe(true);

    const tracing = options.allowedTracingUrls?.[0] as {
      match: (url: string) => boolean;
      propagatorTypes: string[];
    };

    expect(tracing.propagatorTypes).toEqual(["tracecontext"]);
    expect(tracing.match("https://openministry.app/api/x")).toBe(true);
    expect(tracing.match("https://evil.example/api/x")).toBe(false);
  });
});
