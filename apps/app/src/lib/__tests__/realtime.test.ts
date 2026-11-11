import { describe, expect, it, afterEach, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { isRealtimeConfigured, getRealtimeServer } = await import(
  "@/lib/realtime/server"
);

describe("Neon Realtime Server Integration", () => {
  const originalSecret = process.env.NEON_REALTIME_SECRET;
  const originalUrl = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.NEON_REALTIME_SECRET = originalSecret;
    } else {
      delete process.env.NEON_REALTIME_SECRET;
    }

    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_NEON_REALTIME_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    }
  });

  it("reports realtime as not configured when env vars are missing", () => {
    delete process.env.NEON_REALTIME_SECRET;
    delete process.env.NEXT_PUBLIC_NEON_REALTIME_URL;

    expect(isRealtimeConfigured()).toBe(false);
    expect(getRealtimeServer()).toBe(null);
  });

  it("reports realtime as not configured when only one env var is present", () => {
    process.env.NEON_REALTIME_SECRET = "nrt_live_1_dummy";
    delete process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    expect(isRealtimeConfigured()).toBe(false);

    delete process.env.NEON_REALTIME_SECRET;
    process.env.NEXT_PUBLIC_NEON_REALTIME_URL = "wss://live.neon.tech";
    expect(isRealtimeConfigured()).toBe(false);
  });

  it("initializes realtime server instance when valid env vars are present", () => {
    const fakeBytes = new Uint8Array(32).fill(7);
    let binary = "";
    for (let i = 0; i < fakeBytes.length; i++) binary += String.fromCharCode(fakeBytes[i]);
    const b64url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    process.env.NEON_REALTIME_SECRET = `nrt_live_1${b64url}`;
    process.env.NEXT_PUBLIC_NEON_REALTIME_URL = "wss://live.neon.tech/test";

    expect(isRealtimeConfigured()).toBe(true);
    const server = getRealtimeServer();
    expect(server).not.toBe(null);
    expect(typeof server?.seal).toBe("function");
  });
});
