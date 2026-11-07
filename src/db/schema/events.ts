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

import { organization } from "./auth";
import { department, departmentFunction } from "./departments";
import { person } from "./people";

export const event = pgTable(
  "event",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    seriesId: text("series_id"),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind").default("service").notNull(),
    location: text("location"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    recurrence: text("recurrence"),
    recurrenceInterval: integer("recurrence_interval"),
    recurrenceEndsAt: timestamp("recurrence_ends_at"),
    isOverride: boolean("is_override").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("event_organizationId_idx").on(table.organizationId),
    index("event_organizationId_startsAt_idx").on(
      table.organizationId,
      table.startsAt,
    ),
    index("event_seriesId_idx").on(table.seriesId),
  ],
);

export const eventDepartment = pgTable(
  "event_department",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_department_eventId_idx").on(table.eventId),
    index("event_department_departmentId_idx").on(table.departmentId),
    uniqueIndex("event_department_eventId_departmentId_uidx").on(
      table.eventId,
      table.departmentId,
    ),
  ],
);

export const schedule = pgTable(
  "schedule",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("schedule_eventId_uidx").on(table.eventId)],
);

export const scheduleAssignment = pgTable(
  "schedule_assignment",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    functionId: text("function_id")
      .notNull()
      .references(() => departmentFunction.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("schedule_assignment_scheduleId_idx").on(table.scheduleId),
    index("schedule_assignment_personId_idx").on(table.personId),
    uniqueIndex(
      "schedule_assignment_scheduleId_functionId_personId_uidx",
    ).on(table.scheduleId, table.functionId, table.personId),
  ],
);

export const eventRelations = relations(event, ({ one, many }) => ({
  organization: one(organization, {
    fields: [event.organizationId],
    references: [organization.id],
  }),
  departments: many(eventDepartment),
  schedule: one(schedule),
  planItems: many(eventPlanItem),
}));

export const eventDepartmentRelations = relations(
  eventDepartment,
  ({ one }) => ({
    event: one(event, {
      fields: [eventDepartment.eventId],
      references: [event.id],
    }),
    department: one(department, {
      fields: [eventDepartment.departmentId],
      references: [department.id],
    }),
  }),
);

export const scheduleRelations = relations(schedule, ({ one, many }) => ({
  event: one(event, {
    fields: [schedule.eventId],
    references: [event.id],
  }),
  assignments: many(scheduleAssignment),
}));

export const scheduleAssignmentRelations = relations(
  scheduleAssignment,
  ({ one }) => ({
    schedule: one(schedule, {
      fields: [scheduleAssignment.scheduleId],
      references: [schedule.id],
    }),
    department: one(department, {
      fields: [scheduleAssignment.departmentId],
      references: [department.id],
    }),
    function: one(departmentFunction, {
      fields: [scheduleAssignment.functionId],
      references: [departmentFunction.id],
    }),
    person: one(person, {
      fields: [scheduleAssignment.personId],
      references: [person.id],
    }),
  }),
);

export const eventPlanItem = pgTable(
  "event_plan_item",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    sectionId: text("section_id"),
    type: text("type").notNull().default("item"),
    title: text("title").notNull(),
    description: text("description"),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    order: integer("order").default(0).notNull(),
    personId: text("person_id")
      .references(() => person.id, { onDelete: "set null" }),
    customResponsible: text("custom_responsible"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("event_plan_item_eventId_idx").on(table.eventId),
    index("event_plan_item_order_idx").on(table.eventId, table.order),
    index("event_plan_item_sectionId_idx").on(table.sectionId),
  ],
);

export const eventPlanItemRelations = relations(eventPlanItem, ({ one }) => ({
  event: one(event, {
    fields: [eventPlanItem.eventId],
    references: [event.id],
  }),
  person: one(person, {
    fields: [eventPlanItem.personId],
    references: [person.id],
  }),
}));
