import { connection } from "next/server";

import { NotificationBar } from "@/components/app/notification-bar";
import { getUnreadNotificationSummary } from "@/lib/notifications";

export async function NotificationBarLoader() {
  await connection();

  const { latest, count } = await getUnreadNotificationSummary();

  if (!latest) {
    return null;
  }

  return <NotificationBar notification={latest} count={count} />;
}
