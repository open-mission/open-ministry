import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_organizationId_userId_idx").on(
      table.organizationId,
      table.userId,
    ),
    index("notification_userId_readAt_idx").on(
      table.userId,
      table.readAt,
    ),
    index("notification_createdAt_idx").on(table.createdAt),
  ],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  organization: one(organization, {
    fields: [notification.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
  }),
}));

export const organizationNotificationChannel = pgTable(
  "organization_notification_channel",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("evolution_whatsapp"),
    apiUrl: text("api_url"),
    apiKey: text("api_key"),
    instanceName: text("instance_name"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_notif_channel_org_idx").on(table.organizationId),
    uniqueIndex("org_notif_channel_org_channel_uidx").on(
      table.organizationId,
      table.channel,
    ),
  ],
);

export const organizationNotificationChannelRelations = relations(
  organizationNotificationChannel,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationNotificationChannel.organizationId],
      references: [organization.id],
    }),
  }),
);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("push_sub_user_idx").on(table.userId),
    uniqueIndex("push_sub_endpoint_uidx").on(table.endpoint),
  ],
);

export const pushSubscriptionRelations = relations(
  pushSubscription,
  ({ one }) => ({
    user: one(user, {
      fields: [pushSubscription.userId],
      references: [user.id],
    }),
  }),
);
