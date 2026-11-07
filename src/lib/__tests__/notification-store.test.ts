import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { notificationStore } = await import("@/lib/notification-store");


describe("Optimistic Notification Store", () => {
  beforeEach(() => {
    // Reset store state
    notificationStore.init({
      count: 3,
      items: [
        {
          id: "notif-1",
          type: "announcement",
          title: "Aviso importante",
          body: "Corpo do aviso",
          href: "/dashboard",
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif-2",
          type: "schedule_assigned",
          title: "Nova escala",
          body: "Você foi escalado",
          href: "/dashboard/schedules",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  it("initializes count and items correctly", () => {
    const snapshot = notificationStore.getSnapshot();
    expect(snapshot.count).toBe(3);
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0].read).toBe(false);
  });

  it("optimistically dismisses notification bar and decrements badge count", () => {
    notificationStore.dismissBar("notif-1");

    const snapshot = notificationStore.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.dismissedBarIds.has("notif-1")).toBe(true);

    const item1 = snapshot.items.find((i) => i.id === "notif-1");
    expect(item1?.read).toBe(true);
  });

  it("optimistically marks single notification as read", () => {
    notificationStore.markAsRead("notif-2");

    const snapshot = notificationStore.getSnapshot();
    expect(snapshot.count).toBe(2);

    const item2 = snapshot.items.find((i) => i.id === "notif-2");
    expect(item2?.read).toBe(true);
  });

  it("optimistically marks all notifications as read and zeroes count", () => {
    notificationStore.markAllAsRead();

    const snapshot = notificationStore.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.items.every((i) => i.read)).toBe(true);
    expect(snapshot.dismissedBarIds.has("notif-1")).toBe(true);
    expect(snapshot.dismissedBarIds.has("notif-2")).toBe(true);
  });

  it("does not revalidate when cached items are fresh (within 30s TTL)", async () => {
    const previousFetchedAt = notificationStore.getSnapshot().lastFetchedAt;
    await notificationStore.revalidate(false);

    // Should remain unchanged because it was fetched less than 30s ago
    const snapshot = notificationStore.getSnapshot();
    expect(snapshot.lastFetchedAt).toBe(previousFetchedAt);
  });
});
