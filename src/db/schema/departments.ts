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

export const department = pgTable(
  "department",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("department_organizationId_idx").on(table.organizationId),
    uniqueIndex("department_organizationId_name_uidx").on(
      table.organizationId,
      table.name,
    ),
  ],
);

export const departmentFunction = pgTable(
  "department_function",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("department_function_departmentId_idx").on(table.departmentId),
    uniqueIndex("department_function_departmentId_name_uidx").on(
      table.departmentId,
      table.name,
    ),
  ],
);

export const departmentMember = pgTable(
  "department_member",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isLeader: boolean("is_leader").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("department_member_departmentId_idx").on(table.departmentId),
    index("department_member_userId_idx").on(table.userId),
    uniqueIndex("department_member_departmentId_userId_uidx").on(
      table.departmentId,
      table.userId,
    ),
  ],
);

export const departmentMemberFunction = pgTable(
  "department_member_function",
  {
    id: text("id").primaryKey(),
    departmentMemberId: text("department_member_id")
      .notNull()
      .references(() => departmentMember.id, { onDelete: "cascade" }),
    functionId: text("function_id")
      .notNull()
      .references(() => departmentFunction.id, { onDelete: "cascade" }),
    experienceLevel: text("experience_level").default("beginner").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("department_member_function_memberId_idx").on(
      table.departmentMemberId,
    ),
    uniqueIndex("department_member_function_memberId_functionId_uidx").on(
      table.departmentMemberId,
      table.functionId,
    ),
  ],
);

export const departmentRelations = relations(department, ({ one, many }) => ({
  organization: one(organization, {
    fields: [department.organizationId],
    references: [organization.id],
  }),
  functions: many(departmentFunction),
  members: many(departmentMember),
}));

export const departmentFunctionRelations = relations(
  departmentFunction,
  ({ one, many }) => ({
    department: one(department, {
      fields: [departmentFunction.departmentId],
      references: [department.id],
    }),
    assignments: many(departmentMemberFunction),
  }),
);

export const departmentMemberRelations = relations(
  departmentMember,
  ({ one, many }) => ({
    department: one(department, {
      fields: [departmentMember.departmentId],
      references: [department.id],
    }),
    user: one(user, {
      fields: [departmentMember.userId],
      references: [user.id],
    }),
    assignments: many(departmentMemberFunction),
  }),
);

export const departmentMemberFunctionRelations = relations(
  departmentMemberFunction,
  ({ one }) => ({
    member: one(departmentMember, {
      fields: [departmentMemberFunction.departmentMemberId],
      references: [departmentMember.id],
    }),
    function: one(departmentFunction, {
      fields: [departmentMemberFunction.functionId],
      references: [departmentFunction.id],
    }),
  }),
);
