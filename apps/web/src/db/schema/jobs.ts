import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

export const backgroundJob = pgTable(
  "background_job",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    result: jsonb("result").$type<{
      downloadUrl?: string;
      fileName?: string;
      fileSize?: number;
      error?: string;
    }>(),
    error: text("error"),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("bg_job_org_idx").on(table.organizationId),
    index("bg_job_org_status_idx").on(table.organizationId, table.status),
    index("bg_job_created_idx").on(table.organizationId, table.createdAt),
  ],
);

export const backgroundJobRelations = relations(backgroundJob, ({ one }) => ({
  organization: one(organization, {
    fields: [backgroundJob.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [backgroundJob.createdById],
    references: [user.id],
  }),
}));
