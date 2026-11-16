"use client";

import { useEffect } from "react";

import { setSentryUser } from "@/lib/telemetry/sentry";

export function SentryUser({
  userId,
  churchId,
}: {
  userId: string;
  churchId?: string | null;
}) {
  useEffect(() => {
    setSentryUser({ id: userId, churchId });

    return () => {
      setSentryUser(null);
    };
  }, [userId, churchId]);

  return null;
}
