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
    capo: integer("capo").default(0).notNull(),
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
}));
