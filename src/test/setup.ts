import { mock } from "bun:test";

mock.module("server-only", () => ({}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: any) => fn,
}));

mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

mock.module("@/lib/notifications", () => ({
  listNotifications: async () => [
    {
      id: "notif-1",
      type: "announcement",
      title: "Test",
      body: "Test body",
      href: null,
      readAt: null,
      createdAt: new Date(),
    },
  ],
  createNotifications: async () => {},
  markNotificationRead: async () => true,
  markAllNotificationsRead: async () => true,
  countUnreadNotifications: async () => 0,
  listSentAnnouncementsWithReadReceipts: async () => [],
}));

