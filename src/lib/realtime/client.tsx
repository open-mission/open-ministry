"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createRealtimeClient, type RealtimeClient } from "@neon/realtime/client";
import { drizzleParsers } from "@neon/realtime-drizzle/client";
import { RealtimeProvider } from "@neon/realtime-react";

type RealtimeContextValue = {
  isEnabled: boolean;
  client: RealtimeClient | null;
};

const OpenMinistryRealtimeContext = createContext<RealtimeContextValue>({
  isEnabled: false,
  client: null,
});

export function useIsRealtimeActive() {
  return useContext(OpenMinistryRealtimeContext).isEnabled;
}

export function OpenMinistryRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const realtimeUrl = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;

  const [client] = useState<RealtimeClient | null>(() => {
    if (!realtimeUrl) return null;
    try {
      return createRealtimeClient({
        url: realtimeUrl,
        parsers: { ...drizzleParsers },
      });
    } catch {
      return null;
    }
  });

  const value: RealtimeContextValue = {
    isEnabled: Boolean(client),
    client,
  };

  if (!client) {
    return (
      <OpenMinistryRealtimeContext.Provider value={value}>
        {children}
      </OpenMinistryRealtimeContext.Provider>
    );
  }

  return (
    <OpenMinistryRealtimeContext.Provider value={value}>
      <RealtimeProvider client={client}>{children}</RealtimeProvider>
    </OpenMinistryRealtimeContext.Provider>
  );
}
