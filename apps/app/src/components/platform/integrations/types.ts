import type { PlatformIntegrationView } from "@/app/actions/platform";

export type PlatformIntegrationsViewProps = {
  initialIntegrations: PlatformIntegrationView[];
};

export type HealthFeedback = {
  ok: boolean;
  latencyMs: number | null;
  instanceCount?: number;
  error?: string | null;
} | null;

export type ResetTarget = {
  provider: string;
  displayName: string;
};

export type IntegrationCardProps = {
  integration: PlatformIntegrationView;
  onRefresh: () => Promise<void>;
  onRequestReset: () => void;
  isResetting: boolean;
};

export function readStringConfig(
  integration: PlatformIntegrationView,
  key: string,
  fallback = "",
): string {
  const val = integration.config?.[key];
  return typeof val === "string" ? val : fallback;
}

export function healthFeedbackFromIntegration(
  integration: PlatformIntegrationView,
): HealthFeedback {
  if (!integration.lastHealthStatus) return null;
  return {
    ok: integration.lastHealthStatus === "healthy",
    latencyMs: integration.lastHealthLatencyMs,
    error: integration.lastHealthError,
  };
}

export function emptyIntegration(
  provider: string,
  displayName: string,
): PlatformIntegrationView {
  return {
    provider,
    displayName,
    source: "unconfigured",
    hasEnvFallback: false,
    isEnabled: false,
    config: {},
    hasSecret: false,
    maskedSecret: null,
    secretMasks: {},
    lastHealthStatus: null,
    lastHealthLatencyMs: null,
    lastHealthCheckedAt: null,
    lastHealthError: null,
  };
}
