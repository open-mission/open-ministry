ALTER TABLE "song" ADD COLUMN "collection" text;--> statement-breakpoint
CREATE INDEX "song_organizationId_collection_idx" ON "song" USING btree ("organization_id","collection");