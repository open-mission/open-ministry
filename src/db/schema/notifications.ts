import {
  index,
  pgTable,
  text,
  timestamp,
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
