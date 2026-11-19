CREATE TABLE "song_formation_function" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"song_id" text NOT NULL,
	"department_id" text NOT NULL,
	"function_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_section_note" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"song_id" text NOT NULL,
	"department_id" text NOT NULL,
	"section_key" text NOT NULL,
	"section_label" text DEFAULT '' NOT NULL,
	"note" text NOT NULL,
	"updated_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song_formation_function" ADD CONSTRAINT "song_formation_function_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_formation_function" ADD CONSTRAINT "song_formation_function_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_formation_function" ADD CONSTRAINT "song_formation_function_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_formation_function" ADD CONSTRAINT "song_formation_function_function_id_department_function_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."department_function"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_section_note" ADD CONSTRAINT "song_section_note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_section_note" ADD CONSTRAINT "song_section_note_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_section_note" ADD CONSTRAINT "song_section_note_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_section_note" ADD CONSTRAINT "song_section_note_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_formation_function_organizationId_idx" ON "song_formation_function" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "song_formation_function_songId_departmentId_idx" ON "song_formation_function" USING btree ("song_id","department_id");--> statement-breakpoint
CREATE INDEX "song_formation_function_functionId_idx" ON "song_formation_function" USING btree ("function_id");--> statement-breakpoint
CREATE UNIQUE INDEX "song_formation_function_songId_departmentId_functionId_uidx" ON "song_formation_function" USING btree ("song_id","department_id","function_id");--> statement-breakpoint
CREATE INDEX "song_section_note_organizationId_idx" ON "song_section_note" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "song_section_note_songId_departmentId_idx" ON "song_section_note" USING btree ("song_id","department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "song_section_note_songId_departmentId_sectionKey_uidx" ON "song_section_note" USING btree ("song_id","department_id","section_key");
--> statement-breakpoint
-- RLS: leitura das notas por seção e da formação da banda pela conexão app_authenticated.
-- As mutações continuam na conexão owner, com autorização na aplicação.
ALTER TABLE public.song_section_note ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.song_formation_function ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY song_section_note_select_authenticated ON public.song_section_note
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint
CREATE POLICY song_formation_function_select_authenticated ON public.song_formation_function
  FOR SELECT TO app_authenticated
  USING (organization_id IN (SELECT public.current_user_org_ids()));--> statement-breakpoint

GRANT SELECT ON public.song_section_note, public.song_formation_function TO app_authenticated;