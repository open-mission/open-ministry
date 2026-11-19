import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";
import { department, departmentFunction } from "./departments";
import { eventPlanItem } from "./events";

export const song = pgTable(
  "song",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist"),
    tone: text("tone"),
    capo: smallint("capo").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    bpm: integer("bpm"),
    timeSignature: text("time_signature"),
    lyrics: text("lyrics"),
    chords: text("chords"),
    youtubeUrl: text("youtube_url"),
    youtubeMusicUrl: text("youtube_music_url"),
    spotifyUrl: text("spotify_url"),
    collection: text("collection"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("song_organizationId_idx").on(table.organizationId),
    index("song_organizationId_title_idx").on(table.organizationId, table.title),
    index("song_organizationId_collection_idx").on(
      table.organizationId,
      table.collection,
    ),
  ],
);

export const songSectionNote = pgTable(
  "song_section_note",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    sectionLabel: text("section_label").default("").notNull(),
    note: text("note").notNull(),
    updatedById: text("updated_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("song_section_note_organizationId_idx").on(table.organizationId),
    index("song_section_note_songId_departmentId_idx").on(
      table.songId,
      table.departmentId,
    ),
    uniqueIndex("song_section_note_songId_departmentId_sectionKey_uidx").on(
      table.songId,
      table.departmentId,
      table.sectionKey,
    ),
  ],
);

export const songFormationFunction = pgTable(
  "song_formation_function",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    functionId: text("function_id")
      .notNull()
      .references(() => departmentFunction.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("song_formation_function_organizationId_idx").on(
      table.organizationId,
    ),
    index("song_formation_function_songId_departmentId_idx").on(
      table.songId,
      table.departmentId,
    ),
    index("song_formation_function_functionId_idx").on(table.functionId),
    uniqueIndex("song_formation_function_songId_departmentId_functionId_uidx").on(
      table.songId,
      table.departmentId,
      table.functionId,
    ),
  ],
);

export const songRelations = relations(song, ({ one, many }) => ({
  organization: one(organization, {
    fields: [song.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [song.createdById],
    references: [user.id],
  }),
  planItems: many(eventPlanItem),
  sectionNotes: many(songSectionNote),
  formationFunctions: many(songFormationFunction),
}));

export const songSectionNoteRelations = relations(
  songSectionNote,
  ({ one }) => ({
    organization: one(organization, {
      fields: [songSectionNote.organizationId],
      references: [organization.id],
    }),
    song: one(song, {
      fields: [songSectionNote.songId],
      references: [song.id],
    }),
    department: one(department, {
      fields: [songSectionNote.departmentId],
      references: [department.id],
    }),
    updatedBy: one(user, {
      fields: [songSectionNote.updatedById],
      references: [user.id],
    }),
  }),
);

export const songFormationFunctionRelations = relations(
  songFormationFunction,
  ({ one }) => ({
    organization: one(organization, {
      fields: [songFormationFunction.organizationId],
      references: [organization.id],
    }),
    song: one(song, {
      fields: [songFormationFunction.songId],
      references: [song.id],
    }),
    department: one(department, {
      fields: [songFormationFunction.departmentId],
      references: [department.id],
    }),
    function: one(departmentFunction, {
      fields: [songFormationFunction.functionId],
      references: [departmentFunction.id],
    }),
  }),
);
