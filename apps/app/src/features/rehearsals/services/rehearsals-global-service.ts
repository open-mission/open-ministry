import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { listDepartments } from "@/lib/departments";
import { can } from "@/lib/permissions/service";

export type AccessibleRehearsalDepartment = {
  id: string;
  name: string;
  description: string | null;
  canCreate: boolean;
};

/**
 * Lista os ensaios de todos os departamentos acessíveis ao usuário, com as
 * músicas do repertório e os departamentos vinculados a cada ensaio.
 */
export async function listAccessibleRehearsals(
  organizationId: string,
  departmentIds: string[],
) {
  if (departmentIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(departmentIds)].sort();
  const hash16 = createHash("sha256")
    .update(uniqueIds.join(","))
    .digest("hex")
    .slice(0, 16);

  return remember(
    `rehearsals:${organizationId}:depts:${hash16}`,
    30,
    async () => {
      const rows = await db
        .select({ event: schema.event })
        .from(schema.event)
        .where(
          and(
            eq(schema.event.organizationId, organizationId),
            eq(schema.event.kind, "rehearsal"),
            inArray(
              schema.event.id,
              db
                .select({ eventId: schema.eventDepartment.eventId })
                .from(schema.eventDepartment)
                .where(
                  inArray(schema.eventDepartment.departmentId, uniqueIds),
                ),
            ),
          ),
        )
        .orderBy(desc(schema.event.startsAt))
        .limit(200);

      if (rows.length === 0) {
        return [];
      }

      const eventIds = rows.map((row) => row.event.id);
      const [songs, eventDepartments] = await Promise.all([
        db.query.rehearsalSong.findMany({
          where: inArray(schema.rehearsalSong.eventId, eventIds),
          with: { song: true },
          orderBy: (table, { asc: ascending }) => [
            ascending(table.order),
            ascending(table.createdAt),
          ],
        }),
        db.query.eventDepartment.findMany({
          where: inArray(schema.eventDepartment.eventId, eventIds),
          with: { department: { columns: { id: true, name: true } } },
        }),
      ]);

      const songsByEvent = new Map<
        string,
        (typeof songs)[number][]
      >();
      for (const song of songs) {
        const list = songsByEvent.get(song.eventId) ?? [];
        list.push(song);
        songsByEvent.set(song.eventId, list);
      }

      const departmentsByEvent = new Map<
        string,
        { id: string; name: string }[]
      >();
      for (const link of eventDepartments) {
        const list = departmentsByEvent.get(link.eventId) ?? [];
        list.push({ id: link.department.id, name: link.department.name });
        departmentsByEvent.set(link.eventId, list);
      }

      return rows.map((row) => ({
        ...row.event,
        songs: songsByEvent.get(row.event.id) ?? [],
        departments: departmentsByEvent.get(row.event.id) ?? [],
      }));
    },
    [
      `rehearsals:${organizationId}:all`,
      `events:${organizationId}`,
      `departments:${organizationId}`,
    ],
  );
}

/**
 * Departamentos com o módulo de ensaios ativo e leitura liberada para o
 * usuário atual. Também informa se ele pode agendar ensaios em cada um.
 */
export async function getAccessibleRehearsalDepartments(
  organizationId: string,
): Promise<AccessibleRehearsalDepartment[]> {
  const departments = await listDepartments(organizationId);
  const rehearsalDepartments = departments.filter((department) =>
    department.modules.some((module) => module.moduleKey === "rehearsals"),
  );

  const checks = await Promise.all(
    rehearsalDepartments.map(async (department) => {
      const [canRead, canCreate] = await Promise.all([
        can("rehearsals", "read", { departmentId: department.id }),
        can("rehearsals", "createRehearsal", {
          departmentId: department.id,
        }),
      ]);

      return { department, canRead, canCreate };
    }),
  );

  return checks
    .filter((check) => check.canRead)
    .map((check) => ({
      id: check.department.id,
      name: check.department.name,
      description: check.department.description,
      canCreate: check.canCreate,
    }));
}
