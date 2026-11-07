"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createRealtimeClient,
  type RealtimeClient,
} from "@neon/realtime/client";
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

  const [client, setClient] = useState<RealtimeClient | null>(null);

  useEffect(() => {
    if (!realtimeUrl) return;
    try {
      const c = createRealtimeClient({
        url: realtimeUrl,
        parsers: { ...drizzleParsers },
      });
      setClient(c);
      return () => {
        c.close();
      };
    } catch {
      return;
    }
  }, [realtimeUrl]);

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
