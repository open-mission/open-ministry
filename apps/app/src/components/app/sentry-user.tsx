"use client";

import { useEffect } from "react";

import { setSentryUser } from "@/lib/telemetry/sentry";

export function SentryUser({
  userId,
  email,
  name,
}: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  useEffect(() => {
    setSentryUser({ id: userId, email, name });

    return () => {
      setSentryUser(null);
    };
  }, [userId, email, name]);

  return null;
}
