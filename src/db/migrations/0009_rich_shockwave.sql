ALTER TABLE "department_member" DROP CONSTRAINT "department_member_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_assignment" DROP CONSTRAINT "schedule_assignment_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "department_member_userId_idx";--> statement-breakpoint
DROP INDEX "department_member_departmentId_userId_uidx";--> statement-breakpoint
DROP INDEX "schedule_assignment_userId_idx";--> statement-breakpoint
DROP INDEX "schedule_assignment_scheduleId_functionId_userId_uidx";--> statement-breakpoint
ALTER TABLE "department_member" ALTER COLUMN "person_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_assignment" ALTER COLUMN "person_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "department_member_departmentId_personId_uidx" ON "department_member" USING btree ("department_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_assignment_scheduleId_functionId_personId_uidx" ON "schedule_assignment" USING btree ("schedule_id","function_id","person_id");--> statement-breakpoint
ALTER TABLE "department_member" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "schedule_assignment" DROP COLUMN "user_id";