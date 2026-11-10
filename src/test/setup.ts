import { mock } from "bun:test";

mock.module("server-only", () => ({}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: any) => fn,
}));

mock.module("@/app/actions/notifications", () => ({
  getRecentNotificationsAction: async () => [],
  markNotificationReadAction: async () => ({ ok: true }),
  markAllNotificationsReadAction: async () => ({ ok: true }),
}));
