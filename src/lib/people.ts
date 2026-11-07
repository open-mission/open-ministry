import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import {
  isPlaceholderName,
  nameFromEmail,
  normalizeEmail,
  personDisplayName,
} from "@/lib/person-format";

export {
  isPlaceholderName,
  nameFromEmail,
  normalizeEmail,
  personDisplayBirthday,
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
  personHasAccount,
} from "@/lib/person-format";
export type {
  PersonLike,
  PersonUser,
} from "@/lib/person-format";

export async function listPeople(organizationId: string) {
  return remember(
    `org:${organizationId}:people`,
    180,
    async () => {
      const people = await db.query.person.findMany({
        where: eq(schema.person.organizationId, organizationId),
        with: { user: true },
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
      const membershipsByPerson = new Map<
        string,
        typeof memberships
      >();

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

export async function getPerson(
  organizationId: string,
  personId: string,
) {
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

export async function findPersonByEmail(
  organizationId: string,
  email: string,
) {
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

export async function findPersonByUserId(
  organizationId: string,
  userId: string,
) {
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

export type LinkPersonResult =
  | { ok: true; personId: string }
  | { ok: false; error: string };

export async function linkPersonToUser(
  organizationId: string,
  personId: string,
  userId: string,
): Promise<LinkPersonResult> {
  const person = await getPerson(organizationId, personId);

  if (!person) {
    return { ok: false, error: "Pessoa não encontrada." };
  }

  if (person.userId && person.userId !== userId) {
    return {
      ok: false,
      error: "Essa pessoa já está vinculada a outra conta.",
    };
  }

  const membership = await db.query.member.findFirst({
    where: and(
      eq(schema.member.organizationId, organizationId),
      eq(schema.member.userId, userId),
    ),
    with: { user: true },
  });

  if (!membership) {
    return {
      ok: false,
      error: "Essa conta não faz parte da igreja.",
    };
  }

  const conflict = await db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, organizationId),
      eq(schema.person.userId, userId),
      ne(schema.person.id, personId),
    ),
    columns: { id: true },
  });

  if (conflict) {
    return {
      ok: false,
      error: "Essa conta já está vinculada a outra pessoa.",
    };
  }

  const user = membership.user;
  const keepName =
    person.name.trim().length > 0 &&
    !isPlaceholderName(person.name, person.email);

  await db
    .update(schema.person)
    .set({
      userId,
      name: keepName ? person.name : user.name,
      email: person.email ?? normalizeEmail(user.email),
      image: person.image ?? user.image,
      birthday: person.birthday ?? user.birthday,
    })
    .where(eq(schema.person.id, personId));

  await cacheInvalidateTags(`people:${organizationId}`);

  return { ok: true, personId };
}

type UserInput = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  birthday: string | null;
  phone?: string | null;
};

export async function ensurePersonForUser(
  organizationId: string,
  user: UserInput,
) {
  const existing = await findPersonByUserId(organizationId, user.id);

  if (existing) {
    if (!existing.phone && user.phone) {
      await db
        .update(schema.person)
        .set({ phone: user.phone })
        .where(eq(schema.person.id, existing.id));
    }
    return existing;
  }

  const byEmail = await findPersonByEmail(organizationId, user.email);

  if (byEmail) {
    const linked = await linkPersonToUser(
      organizationId,
      byEmail.id,
      user.id,
    );

    if (linked.ok) {
      if (!byEmail.phone && user.phone) {
        await db
          .update(schema.person)
          .set({ phone: user.phone })
          .where(eq(schema.person.id, byEmail.id));
      }
      return getPerson(organizationId, byEmail.id);
    }
  }

  const id = randomUUID();

  await db.insert(schema.person).values({
    id,
    organizationId,
    userId: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
    image: user.image,
    birthday: user.birthday,
    phone: user.phone ?? null,
  });

  await cacheInvalidateTags(`people:${organizationId}`);

  return getPerson(organizationId, id);
}

export async function ensurePersonForEmail({
  organizationId,
  email,
  name,
}: {
  organizationId: string;
  email: string;
  name?: string | null;
}) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return null;
  }

  const existing = await findPersonByEmail(organizationId, normalized);

  if (existing) {
    const shouldUseName =
      Boolean(name?.trim()) &&
      (!existing.userId ||
        isPlaceholderName(existing.name, existing.email));

    if (shouldUseName) {
      await db
        .update(schema.person)
        .set({ name: name!.trim() })
        .where(eq(schema.person.id, existing.id));

      return getPerson(organizationId, existing.id);
    }

    return existing;
  }

  const id = randomUUID();

  await db.insert(schema.person).values({
    id,
    organizationId,
    name: name?.trim() || nameFromEmail(normalized),
    email: normalized,
  });

  return getPerson(organizationId, id);
}

export async function syncPersonProfile(
  userId: string,
  values: {
    name?: string;
    image?: string | null;
    birthday?: string | null;
    phone?: string | null;
  },
) {
  const update: {
    name?: string;
    image?: string | null;
    birthday?: string | null;
    phone?: string | null;
  } = {};

  if (values.name !== undefined) {
    update.name = values.name;
  }

  if (values.image !== undefined) {
    update.image = values.image;
  }

  if (values.birthday !== undefined) {
    update.birthday = values.birthday;
  }

  if (values.phone !== undefined) {
    update.phone = values.phone;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  await db
    .update(schema.person)
    .set(update)
    .where(eq(schema.person.userId, userId));
}
