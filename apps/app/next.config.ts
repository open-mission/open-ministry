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
  // Rotas antigas /dashboard/* continuam funcionando como redirecionamentos
  // permanentes; a constraint do primeiro segmento impede open redirect.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      {
        source: "/dashboard/avisos",
        destination: "/announcements",
        permanent: true,
      },
      { source: "/avisos", destination: "/announcements", permanent: true },
      { source: "/dashboard/events", destination: "/calendar", permanent: true },
      {
        source: "/dashboard/:section([a-z0-9-]+)",
        destination: "/:section",
        permanent: true,
      },
      {
        source: "/dashboard/:section([a-z0-9-]+)/:path+",
        destination: "/:section/:path+",
        permanent: true,
      },
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
