"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { PlatformIntegrationView } from "@/app/actions/platform";

import {
  healthFeedbackFromIntegration,
  type HealthFeedback,
} from "./types";

type TestFeedback = {
  ok: boolean;
  latencyMs: number | null;
  instanceCount?: number;
  error?: string | null;
};

type RunTestOptions = {
  action: () => Promise<TestFeedback>;
  successMessage: (result: TestFeedback) => string;
  fallbackError: string;
};

export function useIntegrationHealth(
  integration: PlatformIntegrationView,
  onRefresh: () => Promise<void>,
) {
  const [health, setHealth] = useState<HealthFeedback>(
    healthFeedbackFromIntegration(integration),
  );
  const [isTesting, startTesting] = useTransition();

  function applyHealth(feedback: TestFeedback) {
    setHealth({
      ok: feedback.ok,
      latencyMs: feedback.latencyMs,
      instanceCount: feedback.instanceCount,
      error: feedback.error,
    });
  }

  function runTest({ action, successMessage, fallbackError }: RunTestOptions) {
    startTesting(async () => {
      const res = await action();
      applyHealth(res);
      await onRefresh();
      if (res.ok) {
        toast.success(successMessage(res));
      } else {
        toast.error(res.error || fallbackError);
      }
    });
  }

  return { health, isTesting, applyHealth, runTest };
}
