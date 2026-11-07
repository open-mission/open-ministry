import "server-only";

import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";

export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEON_REALTIME_SECRET &&
      process.env.NEXT_PUBLIC_NEON_REALTIME_URL,
  );
}

let realtimeInstance: ReturnType<typeof createRealtime> | null = null;

export function getRealtimeServer() {
  if (!isRealtimeConfigured()) {
    return null;
  }

  if (!realtimeInstance) {
    realtimeInstance = createRealtime({
      secret: process.env.NEON_REALTIME_SECRET!,
      db: process.env.PGDATABASE || "neondb",
      adapter: drizzleAdapter(),
      debugMode: process.env.NODE_ENV !== "production",
    });
  }

  return realtimeInstance;
}
