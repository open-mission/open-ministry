import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { listUserLeaderDepartments } from "@/lib/departments";
import {
  getTodayDateString,
  MOOD_LEVELS,
  type MoodDefinition,
  type MoodOverview,
} from "@/lib/felicitometro-types";

export {
  getTodayDateString,
  MOOD_LEVELS,
  type MoodDefinition,
  type MoodOverview,
};

export async function getTodayMoodForPerson(
  organizationId: string,
  personId: string,
  date = getTodayDateString(),
) {
  return db.query.personMood.findFirst({
    where: and(
      eq(schema.personMood.organizationId, organizationId),
      eq(schema.personMood.personId, personId),
      eq(schema.personMood.date, date),
    ),
  });
}

export async function savePersonMood({
  organizationId,
  personId,
  userId,
  score,
  needsPrayer,
  needsTalk,
  notes,
  date = getTodayDateString(),
}: {
  organizationId: string;
  personId: string;
  userId?: string | null;
  score: number;
  needsPrayer: boolean;
  needsTalk: boolean;
  notes?: string | null;
  date?: string;
}) {
  const existing = await getTodayMoodForPerson(organizationId, personId, date);

  if (existing) {
    await db
      .update(schema.personMood)
      .set({
        score,
        needsPrayer,
        needsTalk,
        notes: notes?.trim() || null,
        userId: userId ?? existing.userId,
      })
      .where(eq(schema.personMood.id, existing.id));

    return existing.id;
  }

  const id = randomUUID();
  await db.insert(schema.personMood).values({
    id,
    organizationId,
    personId,
    userId: userId ?? null,
    date,
    score,
    needsPrayer,
    needsTalk,
    notes: notes?.trim() || null,
  });

  return id;
}

export async function getPersonMoodHistory(
  organizationId: string,
  personId: string,
  days = 30,
) {
  const cutoffDate = format(subDays(new Date(), days), "yyyy-MM-dd");

  return db.query.personMood.findMany({
    where: and(
      eq(schema.personMood.organizationId, organizationId),
      eq(schema.personMood.personId, personId),
      gte(schema.personMood.date, cutoffDate),
    ),
    orderBy: [desc(schema.personMood.date)],
  });
}

/**
 * Verifica se um usuário pode visualizar os dados confidenciais do felicitômetro de uma pessoa.
 */
export async function canUserViewPersonMood({
  organizationId,
  viewerUserId,
  targetPersonId,
  isAdmin,
}: {
  organizationId: string;
  viewerUserId: string;
  targetPersonId: string;
  isAdmin: boolean;
}): Promise<boolean> {
  if (isAdmin) {
    return true;
  }

  // Verifica se a própria pessoa é o visualizador
  const viewerPerson = await db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, organizationId),
      eq(schema.person.userId, viewerUserId),
    ),
    columns: { id: true },
  });

  if (viewerPerson && viewerPerson.id === targetPersonId) {
    return true;
  }

  // Verifica se o visualizador lidera algum departamento onde a pessoa é membro
  const leaderDepts = await listUserLeaderDepartments(
    organizationId,
    viewerUserId,
  );

  if (leaderDepts.length === 0) {
    return false;
  }

  const ledDeptIds = leaderDepts.map((d) => d.id);
  const membership = await db.query.departmentMember.findFirst({
    where: and(
      eq(schema.departmentMember.personId, targetPersonId),
      inArray(schema.departmentMember.departmentId, ledDeptIds),
    ),
    columns: { id: true },
  });

  return Boolean(membership);
}

/**
 * Gera o relatório consolidado do Felicitômetro para a igreja ou departamentos liderados.
 */
export async function getOrganizationMoodOverview({
  organizationId,
  viewerUserId,
  isAdmin,
  days = 14,
}: {
  organizationId: string;
  viewerUserId: string;
  isAdmin: boolean;
  days?: number;
}): Promise<MoodOverview> {
  return remember(
    `org:${organizationId}:mood-overview:${viewerUserId}:${isAdmin}:${days}`,
    120,
    async () => {
      const cutoffDate = format(subDays(new Date(), days), "yyyy-MM-dd");

  let allowedPersonIds: string[] | null = null;

  if (!isAdmin) {
    const leaderDepts = await listUserLeaderDepartments(
      organizationId,
      viewerUserId,
    );
    const deptIds = leaderDepts.map((d) => d.id);

    if (deptIds.length === 0) {
      return {
        averageScore: 0,
        totalCheckIns: 0,
        prayerRequestsCount: 0,
        talkRequestsCount: 0,
        dailyTimeline: [],
        scoreDistribution: [],
        recentCareRequests: [],
      };
    }

    const members = await db.query.departmentMember.findMany({
      where: inArray(schema.departmentMember.departmentId, deptIds),
      columns: { personId: true },
    });

    allowedPersonIds = [...new Set(members.map((m) => m.personId))];
    if (allowedPersonIds.length === 0) {
      return {
        averageScore: 0,
        totalCheckIns: 0,
        prayerRequestsCount: 0,
        talkRequestsCount: 0,
        dailyTimeline: [],
        scoreDistribution: [],
        recentCareRequests: [],
      };
    }
  }

  const whereClause = allowedPersonIds
    ? and(
        eq(schema.personMood.organizationId, organizationId),
        gte(schema.personMood.date, cutoffDate),
        inArray(schema.personMood.personId, allowedPersonIds),
      )
    : and(
        eq(schema.personMood.organizationId, organizationId),
        gte(schema.personMood.date, cutoffDate),
      );

  const moodRecords = await db.query.personMood.findMany({
    where: whereClause,
    with: {
      person: true,
    },
    orderBy: [desc(schema.personMood.date)],
  });

  const personIds = [...new Set(moodRecords.map((m) => m.personId))];
  const memberships =
    personIds.length > 0
      ? await db.query.departmentMember.findMany({
          where: inArray(schema.departmentMember.personId, personIds),
          with: { department: true },
        })
      : [];

  const deptNamesByPerson = new Map<string, string[]>();
  for (const m of memberships) {
    const list = deptNamesByPerson.get(m.personId) || [];
    list.push(m.department.name);
    deptNamesByPerson.set(m.personId, list);
  }

  const totalCheckIns = moodRecords.length;
  const scoreSum = moodRecords.reduce((acc, m) => acc + m.score, 0);
  const averageScore = totalCheckIns > 0 ? Number((scoreSum / totalCheckIns).toFixed(1)) : 0;

  const prayerRequestsCount = moodRecords.filter((m) => m.needsPrayer).length;
  const talkRequestsCount = moodRecords.filter((m) => m.needsTalk).length;

  // Distribuição de notas 1 a 5
  const scoreCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const record of moodRecords) {
    if (record.score >= 1 && record.score <= 5) {
      scoreCounts[record.score] = (scoreCounts[record.score] || 0) + 1;
    }
  }

  const colors = ["#e11d48", "#f59e0b", "#3b82f6", "#10b981", "#eab308"];
  const scoreDistribution = [1, 2, 3, 4, 5].map((score) => {
    const def = MOOD_LEVELS[score];
    const count = scoreCounts[score] || 0;
    const percentage = totalCheckIns > 0 ? Math.round((count / totalCheckIns) * 100) : 0;
    return {
      score,
      label: def.shortLabel,
      emoji: def.emoji,
      count,
      percentage,
      color: colors[score - 1],
    };
  });

  // Linha do tempo dos últimos N dias
  const timelineMap = new Map<
    string,
    { sum: number; count: number; prayer: number; talk: number }
  >();

  for (let i = days; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    timelineMap.set(d, { sum: 0, count: 0, prayer: 0, talk: 0 });
  }

  for (const record of moodRecords) {
    const entry = timelineMap.get(record.date);
    if (entry) {
      entry.sum += record.score;
      entry.count += 1;
      if (record.needsPrayer) entry.prayer += 1;
      if (record.needsTalk) entry.talk += 1;
    }
  }

  const dailyTimeline = Array.from(timelineMap.entries()).map(([date, data]) => {
    const parts = date.split("-");
    const month = parts[1];
    const day = parts[2];
    return {
      date,
      displayDate: `${day}/${month}`,
      averageScore: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0,
      count: data.count,
      prayerCount: data.prayer,
      talkCount: data.talk,
    };
  });

  // Pedidos de cuidado recentes (oração ou conversa)
  const recentCareRequests = moodRecords
    .filter((m) => m.needsPrayer || m.needsTalk || m.score <= 2)
    .slice(0, 15)
    .map((m) => ({
      id: m.id,
      personId: m.personId,
      personName: m.person.name,
      personImage: m.person.image,
      personPhone: m.person.phone,
      departmentNames: deptNamesByPerson.get(m.personId) || [],
      date: m.date,
      score: m.score,
      needsPrayer: m.needsPrayer,
      needsTalk: m.needsTalk,
      notes: m.notes,
    }));

      return {
        averageScore,
        totalCheckIns,
        prayerRequestsCount,
        talkRequestsCount,
        dailyTimeline,
        scoreDistribution,
        recentCareRequests,
      };
    },
    [`mood:${organizationId}`],
  );
}
