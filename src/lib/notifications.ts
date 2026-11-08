import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import {
  and,
  count,
  desc,
  eq,
  isNull,
} from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  isTenantDbEnabled,
  withTenantDb,
} from "@/db/tenant";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { getOrganizationContext } from "@/lib/organizations";

export type NotificationRecord =
  typeof schema.notification.$inferSelect;

export async function listNotifications(
  organizationId: string,
  userId: string,
  limit = 50,
  unreadOnly = false,
) {
  return remember(
    `notif:list:${organizationId}:${userId}:${limit}:${unreadOnly ? 1 : 0}`,
    30,
    async () => {
      const where = unreadOnly
        ? and(
            eq(schema.notification.organizationId, organizationId),
            eq(schema.notification.userId, userId),
            isNull(schema.notification.readAt),
          )
        : and(
            eq(schema.notification.organizationId, organizationId),
            eq(schema.notification.userId, userId),
          );

      if (isTenantDbEnabled()) {
        const rows = await withTenantDb((tx) =>
          tx
            .select()
            .from(schema.notification)
            .where(where)
            .orderBy(desc(schema.notification.createdAt))
            .limit(limit),
        );

        if (rows) {
          return rows;
        }
      }

      return db
        .select()
        .from(schema.notification)
        .where(where)
        .orderBy(desc(schema.notification.createdAt))
        .limit(limit);
    },
    [`notifications:${userId}`],
  );
}

export async function countUnreadNotifications(
  organizationId: string,
  userId: string,
) {
  return remember(
    `notif:unread:${organizationId}:${userId}`,
    30,
    async () => {
      const where = and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.userId, userId),
        isNull(schema.notification.readAt),
      );

      if (isTenantDbEnabled()) {
        const rows = await withTenantDb((tx) =>
          tx
            .select({ value: count() })
            .from(schema.notification)
            .where(where),
        );

        if (rows) {
          return Number(rows[0]?.value ?? 0);
        }
      }

      const rows = await db
        .select({ value: count() })
        .from(schema.notification)
        .where(where);

      return Number(rows[0]?.value ?? 0);
    },
    [`notifications:${userId}`],
  );
}

export type NotificationPreviewData = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export const getUnreadNotificationSummary = cache(async () => {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      count: 0,
      latest: null,
      recent: [] as NotificationPreviewData[],
    };
  }

  const rows = await listNotifications(
    context.organization.id,
    context.session.user.id,
    50,
    true,
  );

  let recentRows = rows.slice(0, 5);
  if (recentRows.length < 5) {
    recentRows = await listNotifications(
      context.organization.id,
      context.session.user.id,
      5,
      false,
    );
  }

  return {
    count: rows.length,
    latest: rows[0] ?? null,
    recent: recentRows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: Boolean(n.readAt),
      createdAt: n.createdAt.toISOString(),
    })),
  };
});

export async function markNotificationRead(
  organizationId: string,
  userId: string,
  notificationId: string,
) {
  const rows = await db
    .select({
      id: schema.notification.id,
      readAt: schema.notification.readAt,
    })
    .from(schema.notification)
    .where(
      and(
        eq(schema.notification.id, notificationId),
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.userId, userId),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    return false;
  }

  if (!rows[0].readAt) {
    await db
      .update(schema.notification)
      .set({ readAt: new Date() })
      .where(eq(schema.notification.id, notificationId));

    await cacheInvalidateTags(`notifications:${userId}`);
  }

  return true;
}

export async function markAllNotificationsRead(
  organizationId: string,
  userId: string,
) {
  await db
    .update(schema.notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.userId, userId),
        isNull(schema.notification.readAt),
      ),
    );

  await cacheInvalidateTags(`notifications:${userId}`);
}

export async function createNotifications({
  organizationId,
  userIds,
  actorId,
  type,
  title,
  body,
  href,
}: {
  organizationId: string;
  userIds: string[];
  actorId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  const uniqueUserIds = [
    ...new Set(userIds.filter((userId) => Boolean(userId))),
  ];

  if (uniqueUserIds.length === 0) {
    return;
  }

  await db.insert(schema.notification).values(
    uniqueUserIds.map((userId) => ({
      id: randomUUID(),
      organizationId,
      userId,
      actorId: actorId ?? null,
      type,
      title,
      body: body ?? null,
      href: href ?? null,
    })),
  );

  await Promise.all(
    uniqueUserIds.map((id) => cacheInvalidateTags(`notifications:${id}`)),
  );
}

export async function getNotificationRecipients(
  organizationId: string,
  departmentId?: string | null,
) {
  if (departmentId) {
    const department = await db.query.department.findFirst({
      where: and(
        eq(schema.department.id, departmentId),
        eq(schema.department.organizationId, organizationId),
      ),
      columns: { id: true },
    });

    if (!department) {
      return [];
    }

    const members = await db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.departmentId, departmentId),
      with: {
        person: { with: { user: true } },
      },
    });

    return [
      ...new Set(
        members
          .map((member) => member.person.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
  }

  const members = await db.query.member.findMany({
    where: eq(schema.member.organizationId, organizationId),
    columns: { userId: true },
  });

  return [
    ...new Set(members.map((member) => member.userId)),
  ];
}

export type SentAnnouncementRecipient = {
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  readAt: Date | null;
};

export type SentAnnouncementReceipt = {
  key: string;
  title: string;
  body: string | null;
  createdAt: Date;
  actorId: string | null;
  actorName: string;
  totalRecipients: number;
  readRecipients: number;
  recipients: SentAnnouncementRecipient[];
};

export async function listSentAnnouncementsWithReadReceipts(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  limit = 20,
): Promise<SentAnnouncementReceipt[]> {
  const where = isAdmin
    ? and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.type, "announcement"),
      )
    : and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.type, "announcement"),
        eq(schema.notification.actorId, userId),
      );

  const rows = await db.query.notification.findMany({
    where,
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      actor: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [desc(schema.notification.createdAt)],
    limit: 300,
  });

  const groups = new Map<string, SentAnnouncementReceipt>();

  for (const row of rows) {
    const timeBucket = Math.floor(row.createdAt.getTime() / (120 * 1000));
    const groupKey = `${row.actorId ?? "unknown"}:${row.title}:${timeBucket}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        key: row.id,
        title: row.title,
        body: row.body,
        createdAt: row.createdAt,
        actorId: row.actorId,
        actorName: row.actor?.name ?? "Liderança",
        totalRecipients: 0,
        readRecipients: 0,
        recipients: [],
      };
      groups.set(groupKey, group);
    }

    group.totalRecipients += 1;
    if (row.readAt) {
      group.readRecipients += 1;
    }

    group.recipients.push({
      userId: row.userId,
      name: row.user?.name ?? "Membro",
      email: row.user?.email ?? null,
      image: row.user?.image ?? null,
      readAt: row.readAt,
    });
  }

  return Array.from(groups.values()).slice(0, limit);
}
