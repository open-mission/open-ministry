"use server";

import { getPersonAssignments, splitAssignments } from "@/lib/agenda";
import { listDepartments } from "@/lib/departments";
import {
  buildDepartmentCoverage,
  listEvents,
  splitEvents,
  type DepartmentCoverage,
  type EventListItem,
} from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";
import { can } from "@/lib/permissions/service";
import type { UpcomingAssignment } from "@/lib/agenda";

export type SchedulesPanelData =
  | {
      role: "admin";
      upcoming: EventListItem[];
      past: EventListItem[];
      coverageBoard: DepartmentCoverage[];
      departments: { id: string; name: string }[];
    }
  | {
      role: "member";
      organizationName: string;
      upcoming: UpcomingAssignment[];
      past: UpcomingAssignment[];
    };

/**
 * Fonte de dados do painel "Ver escalas" da agenda.
 *
 * A checagem de permissão acontece aqui, no servidor: nunca entregamos dados de
 * escalas a quem não tem `schedules:read`, mesmo que o botão seja ocultado na
 * UI. Os dados são carregados sob demanda, quando o painel é aberto pela
 * primeira vez, para não penalizar cada visita à agenda.
 */
export async function getSchedulesPanelDataAction(): Promise<SchedulesPanelData | null> {
  const hasAccess = await can("schedules", "read");
  if (!hasAccess) return null;

  const { organization, session, isAdmin } = await requireOrganizationContext();

  if (!isAdmin) {
    const person = await findPersonByUserId(organization.id, session.user.id);
    const assignments = person
      ? await getPersonAssignments(organization.id, person.id)
      : [];
    const { upcoming, past } = splitAssignments(assignments);

    return {
      role: "member",
      organizationName: organization.name,
      upcoming,
      past,
    };
  }

  const [events, departments] = await Promise.all([
    listEvents(organization.id),
    listDepartments(organization.id),
  ]);
  const { upcoming, past } = splitEvents(events);
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return {
    role: "admin",
    upcoming,
    past,
    coverageBoard: buildDepartmentCoverage(upcoming, departmentOptions),
    departments: departmentOptions,
  };
}
