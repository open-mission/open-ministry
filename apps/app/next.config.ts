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
  async rewrites() {
    return [
      { source: "/tasks", destination: "/dashboard/tasks" },
      { source: "/bible", destination: "/dashboard/bible" },
      { source: "/calendar", destination: "/dashboard/calendar" },
      { source: "/events/:path*", destination: "/dashboard/events/:path*" },
      { source: "/events", destination: "/dashboard/events" },
      { source: "/schedules/:path*", destination: "/dashboard/schedules/:path*" },
      { source: "/schedules", destination: "/dashboard/schedules" },
      { source: "/availability", destination: "/dashboard/availability" },
      { source: "/members/:path*", destination: "/dashboard/members/:path*" },
      { source: "/members", destination: "/dashboard/members" },
      { source: "/departments/:path*", destination: "/dashboard/departments/:path*" },
      { source: "/departments", destination: "/dashboard/departments" },
      { source: "/birthdays", destination: "/dashboard/birthdays" },
      { source: "/announcements/:path*", destination: "/dashboard/announcements/:path*" },
      { source: "/announcements", destination: "/dashboard/announcements" },
      { source: "/songs/:path*", destination: "/dashboard/songs/:path*" },
      { source: "/songs", destination: "/dashboard/songs" },
      { source: "/whatsapp/:path*", destination: "/dashboard/whatsapp/:path*" },
      { source: "/whatsapp", destination: "/dashboard/whatsapp" },
      { source: "/emails/:path*", destination: "/dashboard/emails/:path*" },
      { source: "/emails", destination: "/dashboard/emails" },
      { source: "/jobs/:path*", destination: "/dashboard/jobs/:path*" },
      { source: "/jobs", destination: "/dashboard/jobs" },
      { source: "/settings/:path*", destination: "/dashboard/settings/:path*" },
      { source: "/settings", destination: "/dashboard/settings" },
      { source: "/profile/:path*", destination: "/dashboard/profile/:path*" },
      { source: "/profile", destination: "/dashboard/profile" },
      { source: "/church/:path*", destination: "/dashboard/church/:path*" },
      { source: "/church", destination: "/dashboard/church" },
      { source: "/notifications/:path*", destination: "/dashboard/notifications/:path*" },
      { source: "/notifications", destination: "/dashboard/notifications" },
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
