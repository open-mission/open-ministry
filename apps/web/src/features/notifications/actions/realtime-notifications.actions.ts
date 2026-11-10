"use server";

import { desc, eq, and, isNull, sql } from "drizzle-orm";
import type { SealedLiveQuery } from "@neon/realtime/client";

import { db } from "@/db";
import { notification } from "@/db/schema";
import { requireOrganizationContext } from "@/lib/organizations";
import { getRealtimeServer } from "@/lib/realtime/server";

export type LiveNotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function getLiveUnreadNotificationsQuery(): Promise<SealedLiveQuery<LiveNotificationRow> | null> {
  const realtime = getRealtimeServer();
  if (!realtime) {
    return null;
  }

  try {
    const { organization, session } = await requireOrganizationContext();

    const query = db
      .select({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        readAt: sql<Date | null>`${notification.readAt}`.as("readAt"),
        createdAt: sql<Date>`${notification.createdAt}`.as("createdAt"),
      })
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, organization.id),
          eq(notification.userId, session.user.id),
          isNull(notification.readAt),
        ),
      )
      .orderBy(desc(notification.createdAt))
      .limit(20);

    return await realtime.seal({ query });
  } catch {
    return null;
  }
}
