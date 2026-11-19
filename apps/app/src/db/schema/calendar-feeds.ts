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
import { person } from "./people";

/**
 * Assinatura de calendário (ICS) de um membro. O token bruto nunca é
 * armazenado: guardamos apenas o SHA-256 em `token_hash`, para que um vazamento
 * do banco não exponha links de agenda ativos. O link só é exibido uma vez, na
 * criação/rotação.
 */
export const calendarFeed = pgTable(
  "calendar_feed",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    includeServices: boolean("include_services").default(true).notNull(),
    includeRehearsals: boolean("include_rehearsals").default(true).notNull(),
    includeDepartmentEvents: boolean("include_department_events")
      .default(true)
      .notNull(),
    includeAssignments: boolean("include_assignments").default(true).notNull(),
    revokedAt: timestamp("revoked_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("calendar_feed_tokenHash_uidx").on(table.tokenHash),
    index("calendar_feed_organizationId_idx").on(table.organizationId),
    index("calendar_feed_organizationId_personId_idx").on(
      table.organizationId,
      table.personId,
    ),
    index("calendar_feed_personId_idx").on(table.personId),
  ],
);

export const calendarFeedRelations = relations(calendarFeed, ({ one }) => ({
  organization: one(organization, {
    fields: [calendarFeed.organizationId],
    references: [organization.id],
  }),
  person: one(person, {
    fields: [calendarFeed.personId],
    references: [person.id],
  }),
  createdBy: one(user, {
    fields: [calendarFeed.createdByUserId],
    references: [user.id],
  }),
}));
