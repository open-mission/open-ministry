ALTER TABLE "jwks" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
UPDATE "user" SET "role" = 'user';--> statement-breakpoint
UPDATE "user" SET "role" = 'admin'
WHERE EXISTS (
  SELECT 1
  FROM "member"
  WHERE "member"."user_id" = "user"."id"
    AND string_to_array("member"."role", ',') && ARRAY['owner', 'admin']
);