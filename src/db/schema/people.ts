import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

export const person = pgTable(
  "person",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    birthday: text("birthday"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("person_organizationId_idx").on(table.organizationId),
    index("person_userId_idx").on(table.userId),
    uniqueIndex("person_organizationId_userId_uidx").on(
      table.organizationId,
      table.userId,
    ),
    uniqueIndex("person_organizationId_email_uidx").on(
      table.organizationId,
      table.email,
    ),
  ],
);

export const personRelations = relations(person, ({ one }) => ({
  organization: one(organization, {
    fields: [person.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [person.userId],
    references: [user.id],
  }),
}));
