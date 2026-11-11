CREATE TABLE "song" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"tone" text,
	"bpm" integer,
	"time_signature" text,
	"lyrics" text,
	"chords" text,
	"youtube_url" text,
	"youtube_music_url" text,
	"spotify_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_plan_item" ADD COLUMN "song_id" text;--> statement-breakpoint
ALTER TABLE "song" ADD CONSTRAINT "song_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song" ADD CONSTRAINT "song_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_organizationId_idx" ON "song" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "song_organizationId_title_idx" ON "song" USING btree ("organization_id","title");--> statement-breakpoint
ALTER TABLE "event_plan_item" ADD CONSTRAINT "event_plan_item_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_plan_item_songId_idx" ON "event_plan_item" USING btree ("song_id");--> statement-breakpoint
ALTER TABLE public.song ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY song_select_authenticated ON public.song
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT current_user_org_ids()));--> statement-breakpoint
GRANT SELECT ON public.song TO app_authenticated;