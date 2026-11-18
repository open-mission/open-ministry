import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization } from "./auth";
import { department } from "./departments";
import { event } from "./events";
import { song } from "./songs";

export type RehearsalAlertTriggerType = "offset_minutes" | "day_of_at_time";

export const rehearsalSong = pgTable(
  "rehearsal_song",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    order: integer("order").default(0).notNull(),
    musicalKey: text("musical_key"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("rehearsal_song_eventId_idx").on(table.eventId),
    index("rehearsal_song_songId_idx").on(table.songId),
    uniqueIndex("rehearsal_song_eventId_songId_uidx").on(
      table.eventId,
      table.songId,
    ),
  ],
);

export const departmentRehearsalAlert = pgTable(
  "department_rehearsal_alert",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    triggerType: text("trigger_type").$type<RehearsalAlertTriggerType>().notNull(),
    offsetMinutes: integer("offset_minutes"),
    timeOfDay: text("time_of_day"),
    channels: jsonb("channels").$type<string[]>().notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("department_rehearsal_alert_departmentId_idx").on(table.departmentId),
    index("department_rehearsal_alert_organizationId_idx").on(
      table.organizationId,
    ),
  ],
);

export const rehearsalReminder = pgTable(
  "rehearsal_reminder",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    alertRuleId: text("alert_rule_id").references(
      () => departmentRehearsalAlert.id,
      { onDelete: "set null" },
    ),
    label: text("label").notNull(),
    scheduledFor: timestamp("scheduled_for").notNull(),
    channels: jsonb("channels").$type<string[]>().notNull(),
    status: text("status").default("pending").notNull(),
    qstashMessageId: text("qstash_message_id"),
    sentAt: timestamp("sent_at"),
    errorMessage: text("error_message"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("rehearsal_reminder_eventId_idx").on(table.eventId),
    index("rehearsal_reminder_status_scheduledFor_idx").on(
      table.status,
      table.scheduledFor,
    ),
    index("rehearsal_reminder_organizationId_idx").on(table.organizationId),
    uniqueIndex("rehearsal_reminder_dedupeKey_uidx").on(table.dedupeKey),
  ],
);

export const rehearsalSongRelations = relations(rehearsalSong, ({ one }) => ({
  event: one(event, {
    fields: [rehearsalSong.eventId],
    references: [event.id],
  }),
  song: one(song, {
    fields: [rehearsalSong.songId],
    references: [song.id],
  }),
}));

export const departmentRehearsalAlertRelations = relations(
  departmentRehearsalAlert,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [departmentRehearsalAlert.organizationId],
      references: [organization.id],
    }),
    department: one(department, {
      fields: [departmentRehearsalAlert.departmentId],
      references: [department.id],
    }),
    reminders: many(rehearsalReminder),
  }),
);

export const rehearsalReminderRelations = relations(
  rehearsalReminder,
  ({ one }) => ({
    organization: one(organization, {
      fields: [rehearsalReminder.organizationId],
      references: [organization.id],
    }),
    event: one(event, {
      fields: [rehearsalReminder.eventId],
      references: [event.id],
    }),
    department: one(department, {
      fields: [rehearsalReminder.departmentId],
      references: [department.id],
    }),
    alertRule: one(departmentRehearsalAlert, {
      fields: [rehearsalReminder.alertRuleId],
      references: [departmentRehearsalAlert.id],
    }),
  }),
);
