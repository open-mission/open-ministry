import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import {
  clampOffset,
  clampPageLimit,
  paginationCacheSuffix,
  type PaginationOptions,
} from "@/lib/pagination";
import { normalizeEmail, personDisplayName } from "@/lib/person-format";

const PEOPLE_LIMIT_DEFAULT = 1000;
const PEOPLE_LIMIT_MAX = 2000;

export async function listPeople(
  organizationId: string,
  options?: PaginationOptions,
) {
  const limit = clampPageLimit(options?.limit, PEOPLE_LIMIT_DEFAULT, PEOPLE_LIMIT_MAX);
  const offset = clampOffset(options?.offset);

  return remember(
    `org:${organizationId}:people${paginationCacheSuffix(limit, offset, PEOPLE_LIMIT_DEFAULT)}`,
    180,
    async () => {
      const people = await db.query.person.findMany({
        where: eq(schema.person.organizationId, organizationId),
        with: { user: true },
        limit,
        offset,
      });

      if (people.length === 0) {
        return [];
      }

      const memberships = await db.query.departmentMember.findMany({
        where: inArray(
          schema.departmentMember.personId,
          people.map((item) => item.id),
        ),
        with: {
          department: true,
          assignments: {
            with: { function: true },
          },
        },
      });
      const membershipsByPerson = new Map<string, typeof memberships>();

      for (const membership of memberships) {
        const list = membershipsByPerson.get(membership.personId) ?? [];
        list.push(membership);
        membershipsByPerson.set(membership.personId, list);
      }

      return people
        .map((item) => ({
          ...item,
          memberships: membershipsByPerson.get(item.id) ?? [],
        }))
        .sort((a, b) =>
          personDisplayName(a).localeCompare(personDisplayName(b), "pt-BR"),
        );
    },
    [`people:${organizationId}`],
  );
}

export type PersonRecord = Awaited<ReturnType<typeof listPeople>>[number];

/**
 * Lean person projection shared by the dashboard and the calendar: identity
 * fields plus department links, without assignments/functions. Large churches
 * can have hundreds of people, and those nested relations are only needed by
 * the people and event screens.
 */
export async function listPeopleSummary(
  organizationId: string,
  options?: PaginationOptions,
) {
  const limit = clampPageLimit(options?.limit, PEOPLE_LIMIT_DEFAULT, PEOPLE_LIMIT_MAX);
  const offset = clampOffset(options?.offset);

  return remember(
    `org:${organizationId}:people:summary${paginationCacheSuffix(limit, offset, PEOPLE_LIMIT_DEFAULT)}`,
    180,
    async () => {
      const people = await db.query.person.findMany({
        where: eq(schema.person.organizationId, organizationId),
        columns: {
          id: true,
          userId: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          birthday: true,
          createdAt: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
              birthday: true,
            },
          },
        },
        limit,
        offset,
      });

      if (people.length === 0) {
        return [];
      }

      const memberships = await db.query.departmentMember.findMany({
        where: inArray(
          schema.departmentMember.personId,
          people.map((item) => item.id),
        ),
        columns: { personId: true, departmentId: true, isLeader: true },
        with: {
          department: { columns: { name: true } },
        },
      });

      const membershipsByPerson = new Map<string, typeof memberships>();

      for (const membership of memberships) {
        const list = membershipsByPerson.get(membership.personId) ?? [];
        list.push(membership);
        membershipsByPerson.set(membership.personId, list);
      }

      return people
        .map((item) => ({
          ...item,
          memberships: membershipsByPerson.get(item.id) ?? [],
        }))
        .sort((a, b) =>
          personDisplayName(a).localeCompare(personDisplayName(b), "pt-BR"),
        );
    },
    [`people:${organizationId}`, `departments:${organizationId}`],
  );
}

export type PersonSummary = Awaited<
  ReturnType<typeof listPeopleSummary>
>[number];

export async function getPerson(organizationId: string, personId: string) {
  return remember(
    `org:${organizationId}:person:${personId}`,
    300,
    async () => {
      const row = await db.query.person.findFirst({
        where: and(
          eq(schema.person.id, personId),
          eq(schema.person.organizationId, organizationId),
        ),
        with: { user: true },
      });
      return row ?? null;
    },
    [`people:${organizationId}`],
  );
}

export async function findPersonByEmail(organizationId: string, email: string) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return null;
  }

  return db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, organizationId),
      eq(schema.person.email, normalized),
    ),
    with: { user: true },
  });
}

export async function findPersonByUserId(organizationId: string, userId: string) {
  return remember(
    `org:${organizationId}:person:user:${userId}`,
    300,
    async () => {
      const row = await db.query.person.findFirst({
        where: and(
          eq(schema.person.organizationId, organizationId),
          eq(schema.person.userId, userId),
        ),
        with: { user: true },
      });
      return row ?? null;
    },
    [`people:${organizationId}`],
  );
}

export async function findOrganizationMemberByEmail(
  organizationId: string,
  email: string,
) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return null;
  }

  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      birthday: schema.user.birthday,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.user.email, normalized),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function isUserInOrganization(
  organizationId: string,
  userId: string,
) {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(schema.member.organizationId, organizationId),
      eq(schema.member.userId, userId),
    ),
    columns: { id: true },
  });

  return Boolean(membership);
}
