CREATE TABLE "event_department_function" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"department_id" text NOT NULL,
	"function_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_department_function" ADD CONSTRAINT "event_department_function_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_department_function" ADD CONSTRAINT "event_department_function_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_department_function" ADD CONSTRAINT "event_department_function_function_id_department_function_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."department_function"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_department_function_eventId_idx" ON "event_department_function" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_department_function_departmentId_idx" ON "event_department_function" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "event_department_function_functionId_idx" ON "event_department_function" USING btree ("function_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_department_function_eventId_functionId_uidx" ON "event_department_function" USING btree ("event_id","function_id");--> statement-breakpoint
INSERT INTO "event_department_function" ("id", "event_id", "department_id", "function_id", "created_at")
SELECT
  gen_random_uuid()::text,
  ed."event_id",
  ed."department_id",
  df."id",
  now()
FROM "event_department" ed
JOIN "department_function" df ON df."department_id" = ed."department_id"
ON CONFLICT DO NOTHING;
