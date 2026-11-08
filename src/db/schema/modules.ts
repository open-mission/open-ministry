import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { department } from "./departments";

export const departmentModule = pgTable(
  "department_module",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("department_module_departmentId_idx").on(table.departmentId),
    index("department_module_moduleKey_idx").on(table.moduleKey),
    uniqueIndex("department_module_departmentId_moduleKey_uidx").on(
      table.departmentId,
      table.moduleKey,
    ),
  ],
);

export const departmentModuleRelations = relations(
  departmentModule,
  ({ one }) => ({
    department: one(department, {
      fields: [departmentModule.departmentId],
      references: [department.id],
    }),
  }),
);
