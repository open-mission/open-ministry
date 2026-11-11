import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@openministry/ui", "@openministry/db"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
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
