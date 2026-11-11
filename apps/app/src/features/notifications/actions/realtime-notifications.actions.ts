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

// Cache de consultas seladas em memória para otimizar requisições repetidas (TTL de 5 minutos)
const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;
const queryCache = new Map<
  string,
  {
    sealed: SealedLiveQuery<LiveNotificationRow>;
    expiresAt: number;
  }
>();

export async function getLiveUnreadNotificationsQuery(options?: {
  forceFresh?: boolean;
}): Promise<SealedLiveQuery<LiveNotificationRow> | null> {
  const realtime = getRealtimeServer();
  if (!realtime) {
    return null;
  }

  try {
    const { organization, session } = await requireOrganizationContext();
    const cacheKey = `${session.user.id}:${organization.id}`;

    if (!options?.forceFresh) {
      const cached = queryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.sealed;
      }
    }

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

    const sealed = await realtime.seal({ query });
    queryCache.set(cacheKey, {
      sealed,
      expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
    });

    return sealed;
  } catch {
    return null;
  }
}
