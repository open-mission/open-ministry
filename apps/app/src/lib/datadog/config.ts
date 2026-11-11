import type { RumInitConfiguration } from "@datadog/browser-rum";

import { APP_VERSION } from "@/lib/version";

export const DEFAULT_DD_SITE = "datadoghq.com";
export const DEFAULT_DD_SERVICE = "openministry";

const RUM_SESSION_SAMPLE_RATE = 100;
const RUM_SESSION_REPLAY_SAMPLE_RATE = 20;
const RUM_DEFAULT_PRIVACY_LEVEL = "mask-user-input";

export type RumConfig = {
  applicationId: string;
  clientToken: string;
  site: string;
  service: string;
  env: string;
  version: string;
};

export type ServerConfig = {
  apiKey: string;
  site: string;
  service: string;
  env: string;
  version: string;
};

function readEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRumConfig(): RumConfig | null {
  const applicationId = readEnv(process.env.NEXT_PUBLIC_DD_APPLICATION_ID);
  const clientToken = readEnv(process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN);

  if (!applicationId || !clientToken) return null;

  return {
    applicationId,
    clientToken,
    site: readEnv(process.env.NEXT_PUBLIC_DD_SITE) ?? DEFAULT_DD_SITE,
    service: readEnv(process.env.NEXT_PUBLIC_DD_SERVICE) ?? DEFAULT_DD_SERVICE,
    env:
      readEnv(process.env.NEXT_PUBLIC_VERCEL_ENV) ??
      readEnv(process.env.VERCEL_ENV) ??
      readEnv(process.env.NODE_ENV) ??
      "development",
    version: APP_VERSION,
  };
}

export function getServerConfig(): ServerConfig | null {
  const apiKey = readEnv(process.env.DD_API_KEY);

  if (!apiKey) return null;

  return {
    apiKey,
    site: readEnv(process.env.DD_SITE) ?? DEFAULT_DD_SITE,
    service:
      readEnv(process.env.DD_SERVICE) ??
      readEnv(process.env.NEXT_PUBLIC_DD_SERVICE) ??
      DEFAULT_DD_SERVICE,
    env:
      readEnv(process.env.VERCEL_ENV) ??
      readEnv(process.env.NODE_ENV) ??
      "development",
    version: APP_VERSION,
  };
}

export function getLogsEndpoint(site: string): string {
  const normalizedSite = site
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return `https://http-intake.logs.${normalizedSite}/api/v2/logs`;
}

export function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

export function getRumInitOptions(
  config: RumConfig,
  origin: string,
): Omit<RumInitConfiguration, "plugins"> {
  return {
    ...config,
    sessionSampleRate: RUM_SESSION_SAMPLE_RATE,
    sessionReplaySampleRate: RUM_SESSION_REPLAY_SAMPLE_RATE,
    trackResources: true,
    trackUserInteractions: true,
    trackLongTasks: true,
    defaultPrivacyLevel: RUM_DEFAULT_PRIVACY_LEVEL,
    allowedTracingUrls: [
      {
        match: (url: string) => isSameOrigin(url, origin),
        propagatorTypes: ["tracecontext"],
      },
    ],
  };
}
