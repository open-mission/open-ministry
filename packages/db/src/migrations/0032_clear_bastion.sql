ALTER TABLE "song" ALTER COLUMN "capo" SET DATA TYPE smallint;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ranked_songs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id"
      ORDER BY "title", "id"
    ) - 1 AS "sort_order"
  FROM "song"
)
UPDATE "song"
SET "sort_order" = ranked_songs."sort_order"
FROM ranked_songs
WHERE "song"."id" = ranked_songs."id";
