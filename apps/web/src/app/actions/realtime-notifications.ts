"use server";

import {
  getLiveUnreadNotificationsQuery as getLiveUnreadNotificationsQueryAction,
  type LiveNotificationRow,
} from "@/features/notifications/actions/realtime-notifications.actions";
import type { SealedLiveQuery } from "@neon/realtime/client";

export type { LiveNotificationRow };

export async function getLiveUnreadNotificationsQuery(options?: {
  forceFresh?: boolean;
}): Promise<SealedLiveQuery<LiveNotificationRow> | null> {
  return getLiveUnreadNotificationsQueryAction(options);
}
