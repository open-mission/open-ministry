import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";
import { person } from "./people";

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
    webhookSecret: text("webhook_secret"),
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

export const organizationMessageTemplate = pgTable(
  "organization_message_template",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_msg_template_org_idx").on(table.organizationId),
    uniqueIndex("org_msg_template_org_type_uidx").on(
      table.organizationId,
      table.type,
    ),
  ],
);

export const organizationMessageTemplateRelations = relations(
  organizationMessageTemplate,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMessageTemplate.organizationId],
      references: [organization.id],
    }),
  }),
);

export const whatsappMessageLog = pgTable(
  "whatsapp_message_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    notificationId: text("notification_id").references(
      () => notification.id,
      { onDelete: "set null" },
    ),
    batchId: text("batch_id"),
    type: text("type").notNull().default("announcement"),
    recipientPhone: text("recipient_phone").notNull(),
    recipientName: text("recipient_name"),
    personId: text("person_id").references(() => person.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    status: text("status").notNull().default("pending"),
    evolutionMessageId: text("evolution_message_id"),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("whatsapp_log_org_idx").on(table.organizationId),
    index("whatsapp_log_org_status_idx").on(table.organizationId, table.status),
    index("whatsapp_log_batch_idx").on(table.organizationId, table.batchId),
    index("whatsapp_log_evo_id_idx").on(table.evolutionMessageId),
    index("whatsapp_log_created_at_idx").on(table.organizationId, table.createdAt),
    index("whatsapp_log_phone_idx").on(table.organizationId, table.recipientPhone),
  ],
);

export const whatsappMessageLogRelations = relations(
  whatsappMessageLog,
  ({ one }) => ({
    organization: one(organization, {
      fields: [whatsappMessageLog.organizationId],
      references: [organization.id],
    }),
    notification: one(notification, {
      fields: [whatsappMessageLog.notificationId],
      references: [notification.id],
    }),
    person: one(person, {
      fields: [whatsappMessageLog.personId],
      references: [person.id],
    }),
    user: one(user, {
      fields: [whatsappMessageLog.userId],
      references: [user.id],
    }),
  }),
);

export const emailMessageLog = pgTable(
  "email_message_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(
      () => organization.id,
      { onDelete: "cascade" },
    ),
    notificationId: text("notification_id").references(
      () => notification.id,
      { onDelete: "set null" },
    ),
    batchId: text("batch_id"),
    type: text("type").notNull().default("transactional"),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    subject: text("subject").notNull(),
    htmlContent: text("html_content").notNull(),
    textContent: text("text_content"),
    personId: text("person_id").references(() => person.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("sent"),
    brevoMessageId: text("brevo_message_id"),
    attempts: integer("attempts").default(1).notNull(),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("email_log_org_idx").on(table.organizationId),
    index("email_log_org_status_idx").on(table.organizationId, table.status),
    index("email_log_recipient_idx").on(table.recipientEmail),
    index("email_log_type_idx").on(table.type),
    index("email_log_created_at_idx").on(table.createdAt),
  ],
);

export const emailMessageLogRelations = relations(
  emailMessageLog,
  ({ one }) => ({
    organization: one(organization, {
      fields: [emailMessageLog.organizationId],
      references: [organization.id],
    }),
    notification: one(notification, {
      fields: [emailMessageLog.notificationId],
      references: [notification.id],
    }),
    person: one(person, {
      fields: [emailMessageLog.personId],
      references: [person.id],
    }),
    user: one(user, {
      fields: [emailMessageLog.userId],
      references: [user.id],
    }),
  }),
);


