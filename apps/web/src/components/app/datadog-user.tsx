"use client";

import { datadogRum } from "@datadog/browser-rum";
import { useEffect } from "react";

export function DatadogUser({ userId }: { userId: string }) {
  useEffect(() => {
    if (!datadogRum.getInitConfiguration()) return;

    datadogRum.setUser({ id: userId });

    return () => {
      if (datadogRum.getInitConfiguration()) {
        datadogRum.clearUser();
      }
    };
  }, [userId]);

  return null;
}
