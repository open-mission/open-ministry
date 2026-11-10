import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";
import { department } from "./departments";

export const organizationModule = pgTable(
  "organization_module",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_module_org_idx").on(table.organizationId),
    uniqueIndex("org_module_org_key_uidx").on(
      table.organizationId,
      table.moduleKey,
    ),
  ],
);

export const organizationModuleRelations = relations(
  organizationModule,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationModule.organizationId],
      references: [organization.id],
    }),
  }),
);

export const organizationRolePermission = pgTable(
  "organization_role_permission",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "admin" | "leader" | "member"
    moduleKey: text("module_key").notNull(),
    action: text("action").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("org_role_perm_org_idx").on(table.organizationId),
    uniqueIndex("org_role_perm_org_role_action_uidx").on(
      table.organizationId,
      table.role,
      table.moduleKey,
      table.action,
    ),
  ],
);

export const organizationRolePermissionRelations = relations(
  organizationRolePermission,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationRolePermission.organizationId],
      references: [organization.id],
    }),
  }),
);

export const departmentPermissionGrant = pgTable(
  "department_permission_grant",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    departmentId: text("department_id").notNull(),
    granteeUserId: text("grantee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    action: text("action").notNull(),
    grantedByUserId: text("granted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("dept_perm_grant_org_idx").on(table.organizationId),
    index("dept_perm_grant_dept_idx").on(table.departmentId),
    index("dept_perm_grant_grantee_idx").on(table.granteeUserId),
    foreignKey({
      columns: [table.departmentId, table.organizationId],
      foreignColumns: [department.id, department.organizationId],
      name: "dept_perm_grant_dept_org_fk",
    }).onDelete("cascade"),
    uniqueIndex("dept_perm_grant_active_uidx")
      .on(
        table.organizationId,
        table.departmentId,
        table.granteeUserId,
        table.moduleKey,
        table.action,
      )
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

export const departmentPermissionGrantRelations = relations(
  departmentPermissionGrant,
  ({ one }) => ({
    organization: one(organization, {
      fields: [departmentPermissionGrant.organizationId],
      references: [organization.id],
    }),
    department: one(department, {
      fields: [departmentPermissionGrant.departmentId],
      references: [department.id],
    }),
    granteeUser: one(user, {
      fields: [departmentPermissionGrant.granteeUserId],
      references: [user.id],
    }),
    grantedByUser: one(user, {
      fields: [departmentPermissionGrant.grantedByUserId],
      references: [user.id],
    }),
    revokedByUser: one(user, {
      fields: [departmentPermissionGrant.revokedByUserId],
      references: [user.id],
    }),
  }),
);
