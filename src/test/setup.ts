import { mock } from "bun:test";

mock.module("server-only", () => ({}));

mock.module("@/app/actions/notifications", () => ({
  getRecentNotificationsAction: async () => [],
  markNotificationReadAction: async () => ({ ok: true }),
  markAllNotificationsReadAction: async () => ({ ok: true }),
}));
