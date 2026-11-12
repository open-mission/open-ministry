import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";
import { department } from "./departments";
import { person } from "./people";

export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    date: timestamp("date", { withTimezone: true }),
    deadline: timestamp("deadline", { withTimezone: true }),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    status: text("status")
      .$type<"todo" | "in_progress" | "completed" | "canceled">()
      .default("todo")
      .notNull(),
    priority: text("priority")
      .$type<"none" | "low" | "medium" | "high">()
      .default("none")
      .notNull(),
    url: text("url"),
    scope: text("scope")
      .$type<"personal" | "department" | "organization">()
      .default("personal")
      .notNull(),
    departmentId: text("department_id").references(() => department.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    assigneePersonId: text("assignee_person_id").references(() => person.id, {
      onDelete: "set null",
    }),
    delegationType: text("delegation_type")
      .$type<"single" | "shared" | "individual">()
      .default("single")
      .notNull(),
    parentTaskId: text("parent_task_id"),
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrenceRule: text("recurrence_rule"),
    sortOrder: integer("sort_order").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedById: text("completed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("task_organizationId_idx").on(table.organizationId),
    index("task_org_status_idx").on(table.organizationId, table.status),
    index("task_org_created_by_idx").on(table.organizationId, table.createdById),
    index("task_org_assignee_idx").on(table.organizationId, table.assigneeId),
    index("task_org_dept_idx").on(table.organizationId, table.departmentId),
    index("task_org_scope_idx").on(table.organizationId, table.scope),
    index("task_date_idx").on(table.date),
    index("task_deadline_idx").on(table.deadline),
    index("task_parent_idx").on(table.parentTaskId),
  ],
);

export const taskRelations = relations(task, ({ one, many }) => ({
  organization: one(organization, {
    fields: [task.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [task.createdById],
    references: [user.id],
    relationName: "taskCreator",
  }),
  assignee: one(user, {
    fields: [task.assigneeId],
    references: [user.id],
    relationName: "taskAssignee",
  }),
  assigneePerson: one(person, {
    fields: [task.assigneePersonId],
    references: [person.id],
  }),
  completedBy: one(user, {
    fields: [task.completedById],
    references: [user.id],
    relationName: "taskCompleter",
  }),
  department: one(department, {
    fields: [task.departmentId],
    references: [department.id],
  }),
  parentTask: one(task, {
    fields: [task.parentTaskId],
    references: [task.id],
    relationName: "subtasks",
  }),
  subtasks: many(task, {
    relationName: "subtasks",
  }),
  auditLogs: many(taskAuditLog),
}));

export const taskAuditLog = pgTable(
  "task_audit_log",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // "created" | "updated" | "status_changed" | "reordered" | "completed" | "reopened" | "deleted"
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("task_audit_task_idx").on(table.taskId),
    index("task_audit_org_idx").on(table.organizationId),
    index("task_audit_created_idx").on(table.createdAt),
  ],
);

export const taskAuditLogRelations = relations(taskAuditLog, ({ one }) => ({
  task: one(task, {
    fields: [taskAuditLog.taskId],
    references: [task.id],
  }),
  actor: one(user, {
    fields: [taskAuditLog.actorId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [taskAuditLog.organizationId],
    references: [organization.id],
  }),
}));
