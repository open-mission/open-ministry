"use client";

import { datadogRum } from "@datadog/browser-rum";
import { useEffect } from "react";

import { setSentryUser } from "@/lib/telemetry/sentry";

export function DatadogUser({
  userId,
  email,
  name,
}: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  useEffect(() => {
    // Sentry attribution
    setSentryUser({ id: userId, email, name });

    // Datadog attribution
    if (datadogRum.getInitConfiguration()) {
      datadogRum.setUser({ id: userId, email: email || undefined, name: name || undefined });
    }

    return () => {
      setSentryUser(null);
      if (datadogRum.getInitConfiguration()) {
        datadogRum.clearUser();
      }
    };
  }, [userId, email, name]);

  return null;
}
