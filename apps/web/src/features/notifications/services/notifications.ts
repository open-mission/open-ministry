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
  userId?: string | null;
  personId?: string | null;
  name: string;
  email?: string | null;
  image?: string | null;
  readAt?: Date | null;
  whatsapp?: {
    logId: string;
    phone: string;
    status: "pending" | "sending" | "sent" | "delivered" | "read" | "failed";
    lastError?: string | null;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
    readAt?: Date | null;
  } | null;
};

export type SentAnnouncementReceipt = {
  key: string;
  batchId?: string | null;
  title: string;
  body: string | null;
  createdAt: Date;
  actorId: string | null;
  actorName: string;
  totalRecipients: number;
  readRecipients: number;
  whatsappSummary?: {
    total: number;
    pending: number;
    sending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  recipients: SentAnnouncementRecipient[];
};

export async function listSentAnnouncementsWithReadReceipts(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  limit = 20,
): Promise<SentAnnouncementReceipt[]> {
  const notifWhere = isAdmin
    ? and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.type, "announcement"),
      )
    : and(
        eq(schema.notification.organizationId, organizationId),
        eq(schema.notification.type, "announcement"),
        eq(schema.notification.actorId, userId),
      );

  const [notificationRows, whatsappLogs] = await Promise.all([
    db.query.notification.findMany({
      where: notifWhere,
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
    }),
    db.query.whatsappMessageLog.findMany({
      where: and(
        eq(schema.whatsappMessageLog.organizationId, organizationId),
        eq(schema.whatsappMessageLog.type, "announcement"),
      ),
      orderBy: [desc(schema.whatsappMessageLog.createdAt)],
      limit: 300,
    }),
  ]);

  const groups = new Map<string, SentAnnouncementReceipt>();

  // 1. Process in-app notifications
  for (const row of notificationRows) {
    const timeBucket = Math.floor(row.createdAt.getTime() / (180 * 1000));
    const groupKey = `${row.actorId ?? "unknown"}:${row.title}:${timeBucket}`;

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        key: row.id,
        batchId: null,
        title: row.title,
        body: row.body,
        createdAt: row.createdAt,
        actorId: row.actorId,
        actorName: row.actor?.name ?? "Liderança",
        totalRecipients: 0,
        readRecipients: 0,
        whatsappSummary: {
          total: 0,
          pending: 0,
          sending: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        },
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
      whatsapp: null,
    });
  }

  // 2. Associate WhatsApp message logs
  for (const log of whatsappLogs) {
    // Try matching to an existing group by batchId or time proximity
    let matchedGroup: SentAnnouncementReceipt | undefined;

    if (log.batchId) {
      for (const g of groups.values()) {
        if (g.batchId === log.batchId) {
          matchedGroup = g;
          break;
        }
      }
    }

    if (!matchedGroup) {
      // Find group within 3 minutes of log createdAt
      const logTime = log.createdAt.getTime();
      for (const g of groups.values()) {
        const diffMinutes = Math.abs(g.createdAt.getTime() - logTime) / (60 * 1000);
        if (diffMinutes <= 3) {
          matchedGroup = g;
          if (log.batchId && !g.batchId) {
            g.batchId = log.batchId;
          }
          break;
        }
      }
    }

    if (!matchedGroup) {
      // Standalone WhatsApp-only announcement
      const timeBucket = Math.floor(log.createdAt.getTime() / (180 * 1000));
      const groupKey = `wa:${log.batchId ?? log.id}:${timeBucket}`;

      matchedGroup = {
        key: log.id,
        batchId: log.batchId,
        title: "Aviso via WhatsApp",
        body: log.content,
        createdAt: log.createdAt,
        actorId: null,
        actorName: "Liderança",
        totalRecipients: 0,
        readRecipients: 0,
        whatsappSummary: {
          total: 0,
          pending: 0,
          sending: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        },
        recipients: [],
      };
      groups.set(groupKey, matchedGroup);
    }

    // Update whatsappSummary metrics
    if (matchedGroup.whatsappSummary) {
      matchedGroup.whatsappSummary.total += 1;
      const st = log.status as keyof typeof matchedGroup.whatsappSummary;
      if (typeof matchedGroup.whatsappSummary[st] === "number") {
        matchedGroup.whatsappSummary[st] += 1;
      }
    }

    const waData = {
      logId: log.id,
      phone: log.recipientPhone,
      status: log.status as
        | "pending"
        | "sending"
        | "sent"
        | "delivered"
        | "read"
        | "failed",
      lastError: log.lastError,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      readAt: log.readAt,
    };

    // Find recipient in group by userId or personId
    const existingRecipient = matchedGroup.recipients.find(
      (r) =>
        (log.userId && r.userId === log.userId) ||
        (log.personId && r.personId === log.personId) ||
        (log.recipientName && r.name === log.recipientName),
    );

    if (existingRecipient) {
      existingRecipient.whatsapp = waData;
    } else {
      matchedGroup.recipients.push({
        userId: log.userId,
        personId: log.personId,
        name: log.recipientName || "Membro",
        email: null,
        image: null,
        readAt: null,
        whatsapp: waData,
      });
      matchedGroup.totalRecipients += 1;
    }
  }

  // Sort by createdAt descending and slice
  return Array.from(groups.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}
