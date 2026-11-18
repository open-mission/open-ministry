import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/lib/security-headers";
import { resolveClientIdentifyUrl } from "./src/lib/better-auth-infra";

// Variáveis sem prefixo NEXT_PUBLIC_ não entram no bundle do cliente por
// padrão. Quando BETTER_AUTH_IDENTIFY_URL (ou BETTER_AUTH_KV_URL) estiver
// configurada no servidor, expomos a URL de identify normalizada abaixo.
const betterAuthIdentifyUrl = resolveClientIdentifyUrl({
  NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL,
  BETTER_AUTH_IDENTIFY_URL: process.env.BETTER_AUTH_IDENTIFY_URL,
  NEXT_PUBLIC_BETTER_AUTH_KV_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_KV_URL,
  BETTER_AUTH_KV_URL: process.env.BETTER_AUTH_KV_URL,
});

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@openministry/ui", "@openministry/db"],
  cacheComponents: true,
  partialPrefetching: true,
  ...(betterAuthIdentifyUrl
    ? {
        env: {
          NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL: betterAuthIdentifyUrl,
        },
      }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders({
          nodeEnv: process.env.NODE_ENV ?? "development",
          realtimeUrl: process.env.NEXT_PUBLIC_NEON_REALTIME_URL,
          sentinelUrl: betterAuthIdentifyUrl,
        }),
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async rewrites() {
    return [
      { source: "/tasks", destination: "/dashboard/tasks" },
      { source: "/bible", destination: "/dashboard/bible" },
      { source: "/calendar", destination: "/dashboard/calendar" },
      { source: "/events", destination: "/dashboard/events" },
      { source: "/events/:path+", destination: "/dashboard/events/:path+" },
      { source: "/schedules", destination: "/dashboard/schedules" },
      { source: "/schedules/:path+", destination: "/dashboard/schedules/:path+" },
      { source: "/availability", destination: "/dashboard/availability" },
      { source: "/members", destination: "/dashboard/members" },
      { source: "/members/:path+", destination: "/dashboard/members/:path+" },
      { source: "/departments", destination: "/dashboard/departments" },
      { source: "/departments/:path+", destination: "/dashboard/departments/:path+" },
      { source: "/birthdays", destination: "/dashboard/birthdays" },
      { source: "/announcements", destination: "/dashboard/announcements" },
      { source: "/announcements/:path+", destination: "/dashboard/announcements/:path+" },
      { source: "/songs", destination: "/dashboard/songs" },
      { source: "/songs/:path+", destination: "/dashboard/songs/:path+" },
      { source: "/rehearsals", destination: "/dashboard/rehearsals" },
      {
        source: "/rehearsals/:path+",
        destination: "/dashboard/rehearsals/:path+",
      },
      { source: "/whatsapp", destination: "/dashboard/whatsapp" },
      { source: "/whatsapp/:path+", destination: "/dashboard/whatsapp/:path+" },
      { source: "/emails", destination: "/dashboard/emails" },
      { source: "/emails/:path+", destination: "/dashboard/emails/:path+" },
      { source: "/jobs", destination: "/dashboard/jobs" },
      { source: "/jobs/:path+", destination: "/dashboard/jobs/:path+" },
      { source: "/settings", destination: "/dashboard/settings" },
      { source: "/settings/:path+", destination: "/dashboard/settings/:path+" },
      { source: "/profile", destination: "/dashboard/profile" },
      { source: "/profile/:path+", destination: "/dashboard/profile/:path+" },
      { source: "/church", destination: "/dashboard/church" },
      { source: "/church/:path+", destination: "/dashboard/church/:path+" },
      { source: "/notifications", destination: "/dashboard/notifications" },
      { source: "/notifications/:path+", destination: "/dashboard/notifications/:path+" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "open-mission",
  project: "open-ministry",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
