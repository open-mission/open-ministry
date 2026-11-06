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
import { getOrganizationContext } from "@/lib/organizations";

export type NotificationRecord =
  typeof schema.notification.$inferSelect;

export async function listNotifications(
  organizationId: string,
  userId: string,
  limit = 50,
  unreadOnly = false,
) {
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
}

export async function countUnreadNotifications(
  organizationId: string,
  userId: string,
) {
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
}

export const getUnreadNotificationSummary = cache(async () => {
  const context = await getOrganizationContext();

  if (!context) {
    return { count: 0, latest: null };
  }

  const rows = await listNotifications(
    context.organization.id,
    context.session.user.id,
    50,
    true,
  );

  return { count: rows.length, latest: rows[0] ?? null };
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
