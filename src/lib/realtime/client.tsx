"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
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

let sharedClient: RealtimeClient | null = null;
const noopSubscribe = () => () => {};

function getClientSnapshot(): RealtimeClient | null {
  if (typeof window === "undefined") return null;
  const realtimeUrl = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
  if (!realtimeUrl) return null;
  if (!sharedClient) {
    try {
      sharedClient = createRealtimeClient({
        url: realtimeUrl,
        parsers: { ...drizzleParsers },
      });
    } catch {
      return null;
    }
  }
  return sharedClient;
}

function getServerSnapshot(): RealtimeClient | null {
  return null;
}

export function OpenMinistryRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const client = useSyncExternalStore(
    noopSubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

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
