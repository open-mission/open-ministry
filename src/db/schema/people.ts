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

export const personRelations = relations(person, ({ one, many }) => ({
  organization: one(organization, {
    fields: [person.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [person.userId],
    references: [user.id],
  }),
  availabilities: many(personAvailability),
  unavailabilities: many(personUnavailability),
}));

export type AvailabilityPeriod = "morning" | "afternoon" | "evening";

export const personAvailability = pgTable(
  "person_availability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    periods: jsonb("periods").$type<AvailabilityPeriod[]>().notNull().default([]),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("person_availability_org_person_idx").on(
      table.organizationId,
      table.personId,
    ),
    uniqueIndex("person_availability_person_day_uidx").on(
      table.organizationId,
      table.personId,
      table.dayOfWeek,
    ),
  ],
);

export const personAvailabilityRelations = relations(
  personAvailability,
  ({ one }) => ({
    organization: one(organization, {
      fields: [personAvailability.organizationId],
      references: [organization.id],
    }),
    person: one(person, {
      fields: [personAvailability.personId],
      references: [person.id],
    }),
  }),
);

export const personUnavailability = pgTable(
  "person_unavailability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // Format "YYYY-MM-DD"
    reason: text("reason"),
    allDay: boolean("all_day").default(true).notNull(),
    periods: jsonb("periods").$type<AvailabilityPeriod[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("person_unavailability_org_person_idx").on(
      table.organizationId,
      table.personId,
    ),
    index("person_unavailability_date_idx").on(
      table.organizationId,
      table.date,
    ),
    uniqueIndex("person_unavailability_person_date_uidx").on(
      table.organizationId,
      table.personId,
      table.date,
    ),
  ],
);

export const personUnavailabilityRelations = relations(
  personUnavailability,
  ({ one }) => ({
    organization: one(organization, {
      fields: [personUnavailability.organizationId],
      references: [organization.id],
    }),
    person: one(person, {
      fields: [personUnavailability.personId],
      references: [person.id],
    }),
  }),
);

