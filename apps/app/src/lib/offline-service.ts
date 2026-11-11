import "server-only";

import { and, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getUpcomingAssignments } from "@/lib/agenda";
import { listUserLeaderDepartments } from "@/lib/departments";
import { eventDateParts, formatEventTimeRange } from "@/lib/events";
import { isAdminRole } from "@/lib/format";
import type {
  OfflineAssignment,
  OfflineContact,
  OfflineEvent,
  OfflineFullSchedule,
  OfflineOrderOfService,
  OfflinePayload,
  OfflinePlanItem,
} from "@/lib/offline-types";
import { personDisplayName } from "@/lib/people";
import { computePlanItemTimes } from "@/lib/plan-utils";

export async function getOfflineBundle(
  organizationId: string,
  userId: string,
): Promise<OfflinePayload> {
  const [membership, org, userRecord] = await Promise.all([
    db.query.member.findFirst({
      where: and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, userId),
      ),
    }),
    db.query.organization.findFirst({
      where: eq(schema.organization.id, organizationId),
    }),
    db.query.user.findFirst({
      where: eq(schema.user.id, userId),
    }),
  ]);

  if (!membership || !org || !userRecord) {
    throw new Error("Acesso não autorizado ou organização não encontrada");
  }

  const isAdmin = isAdminRole(membership.role);
  const leaderDepts = await listUserLeaderDepartments(organizationId, userId);
  const isLeader = leaderDepts.length > 0;

  const roleLevel: "member" | "leader" | "admin" = isAdmin
    ? "admin"
    : isLeader
      ? "leader"
      : "member";

  // Identificar registro de Person do usuário
  const person = await db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, organizationId),
      eq(schema.person.userId, userId),
    ),
  });

  // 1. Minhas Escalas
  let myAssignments: OfflineAssignment[] = [];
  if (person) {
    const rawAssignments = await getUpcomingAssignments(organizationId, person.id, 20);
    myAssignments = rawAssignments.map((a) => {
      const parts = eventDateParts(a.schedule.event.startsAt);
      const time = formatEventTimeRange(
        a.schedule.event.startsAt,
        a.schedule.event.endsAt,
      );

      return {
        id: a.id,
        eventId: a.schedule.eventId,
        eventTitle: a.schedule.event.title,
        startsAt: a.schedule.event.startsAt.toISOString(),
        endsAt: a.schedule.event.endsAt.toISOString(),
        formattedDate: `${parts.weekday}, ${parts.day} de ${parts.monthShort}`,
        formattedTime: time,
        functionName: a.function.name,
        departmentName: a.department.name,
      };
    });
  }

  // 2. Próximos eventos da igreja (últimas 4 horas até o futuro)
  const cutoffTime = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const events = await db.query.event.findMany({
    where: and(
      eq(schema.event.organizationId, organizationId),
      gte(schema.event.endsAt, cutoffTime),
    ),
    with: {
      departments: {
        with: {
          department: true,
        },
      },
      schedule: {
        with: {
          assignments: {
            with: {
              person: { with: { user: true } },
              function: true,
              department: true,
            },
          },
        },
      },
      planItems: {
        with: {
          person: { with: { user: true } },
        },
        orderBy: (items, { asc }) => [asc(items.order), asc(items.createdAt)],
      },
    },
    orderBy: (ev, { asc }) => [asc(ev.startsAt)],
    limit: 10,
  });

  const upcomingEvents: OfflineEvent[] = events.map((ev) => {
    const parts = eventDateParts(ev.startsAt);
    const time = formatEventTimeRange(ev.startsAt, ev.endsAt);

    return {
      id: ev.id,
      title: ev.title,
      startsAt: ev.startsAt.toISOString(),
      endsAt: ev.endsAt.toISOString(),
      formattedDate: `${parts.weekday}, ${parts.day} de ${parts.monthShort}`,
      formattedTime: time,
      description: ev.description,
      departments: ev.departments.map((d) => d.department.name),
    };
  });

  // 3. Ordem do Culto (Cronogramas) - Para Líderes e Admins
  const ordersOfService: OfflineOrderOfService[] = [];
  const fullSchedules: OfflineFullSchedule[] = [];
  const emergencyContacts: OfflineContact[] = [];

  const ledDeptIds = new Set(leaderDepts.map((d) => d.id));

  // Próximos 5 eventos com cronograma detalhado
  const detailedEvents = events.slice(0, 5);

  for (const ev of detailedEvents) {
    const parts = eventDateParts(ev.startsAt);
    const time = formatEventTimeRange(ev.startsAt, ev.endsAt);

    // Ordem do culto (Líderes e Admins podem consultar a liturgia inteira)
    if (roleLevel === "admin" || roleLevel === "leader") {
      const { computedItems } = computePlanItemTimes(ev.startsAt, ev.planItems);

      const items: OfflinePlanItem[] = computedItems.map((ci) => ({
        id: ci.id,
        title: ci.title,
        description: ci.description,
        type: ci.type,
        order: ci.order,
        durationMinutes: Math.round(ci.durationSeconds / 60),
        startTime: ci.timeLabel,
        endTime: formatEventTimeRange(ci.calculatedStartTime, ci.calculatedEndTime).split(" - ")[1] ?? ci.timeLabel,
        responsibleName: ci.person?.name ?? ci.customResponsible ?? null,
      }));

      ordersOfService.push({
        eventId: ev.id,
        eventTitle: ev.title,
        startsAt: ev.startsAt.toISOString(),
        endsAt: ev.endsAt.toISOString(),
        formattedDate: `${parts.weekday}, ${parts.day} de ${parts.monthShort}`,
        formattedTime: time,
        items,
      });
    }

    // Escalas detalhadas de voluntários
    if (ev.schedule?.assignments) {
      const allowedAssignments = ev.schedule.assignments.filter((a) => {
        if (isAdmin) return true;
        if (isLeader) return ledDeptIds.has(a.departmentId);
        return false;
      });

      if (allowedAssignments.length > 0) {
        fullSchedules.push({
          eventId: ev.id,
          eventTitle: ev.title,
          startsAt: ev.startsAt.toISOString(),
          formattedDate: `${parts.weekday}, ${parts.day} de ${parts.monthShort}`,
          roster: allowedAssignments.map((a) => ({
            id: a.id,
            departmentName: a.department.name,
            functionName: a.function.name,
            personName: personDisplayName(a.person),
            personPhone: a.person.phone ?? a.person.user?.phone ?? null,
          })),
        });
      }
    }
  }

  // 4. Contatos de Emergência (Liderança e Administração com telefones)
  if (roleLevel === "admin" || roleLevel === "leader") {
    // Buscar membros da liderança
    const deptMembers = await db.query.departmentMember.findMany({
      where: and(
        eq(schema.departmentMember.isLeader, true),
      ),
      with: {
        person: { with: { user: true } },
        department: true,
      },
    });

    const contactMap = new Map<string, OfflineContact>();

    for (const dm of deptMembers) {
      if (dm.department.organizationId !== organizationId) continue;
      const phone = dm.person.phone ?? dm.person.user?.phone ?? null;

      contactMap.set(dm.person.id, {
        id: dm.person.id,
        name: personDisplayName(dm.person),
        role: "Líder de Departamento",
        departmentName: dm.department.name,
        phone,
        email: dm.person.email ?? dm.person.user?.email ?? null,
      });
    }

    // Adicionar administradores
    const allPeople = await db.query.person.findMany({
      where: eq(schema.person.organizationId, organizationId),
      with: { user: true },
    });

    for (const p of allPeople) {
      if (contactMap.has(p.id)) continue;
      const phone = p.phone ?? p.user?.phone ?? null;
      if (phone) {
        contactMap.set(p.id, {
          id: p.id,
          name: personDisplayName(p),
          role: "Membro da Igreja",
          phone,
          email: p.email ?? p.user?.email ?? null,
        });
      }
    }

    emergencyContacts.push(...Array.from(contactMap.values()).slice(0, 30));
  }

  return {
    syncedAt: new Date().toISOString(),
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: membership.role,
      organizationId: org.id,
      organizationName: org.name,
    },
    roleLevel,
    myAssignments,
    upcomingEvents,
    ordersOfService,
    fullSchedules,
    emergencyContacts,
  };
}
