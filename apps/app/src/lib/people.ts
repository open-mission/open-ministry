import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import {
  isPlaceholderName,
  nameFromEmail,
  normalizeEmail,
} from "@/lib/person-format";
import {
  findPersonByEmail,
  findPersonByUserId,
  getPerson,
} from "./people/queries";

export {
  findOrganizationMemberByEmail,
  findPersonByEmail,
  findPersonByUserId,
  getPerson,
  isUserInOrganization,
  listPeople,
  listPeopleSummary,
} from "./people/queries";
export type { PersonRecord, PersonSummary } from "./people/queries";
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
export type { PersonLike, PersonUser } from "@/lib/person-format";

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

  await cacheInvalidateTags(`people:${organizationId}`, `org:${organizationId}`);

  return { ok: true, personId };
}

export async function unlinkPersonFromUser(
  organizationId: string,
  personId: string,
): Promise<{ ok: boolean; error?: string }> {
  const person = await getPerson(organizationId, personId);

  if (!person) {
    return { ok: false, error: "Pessoa não encontrada." };
  }

  if (!person.userId) {
    return { ok: false, error: "Esta pessoa não possui conta vinculada." };
  }

  await db
    .update(schema.person)
    .set({
      userId: null,
    })
    .where(eq(schema.person.id, personId));

  await cacheInvalidateTags(`people:${organizationId}`, `org:${organizationId}`);

  return { ok: true };
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
      await cacheInvalidateTags(`people:${organizationId}`);
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
      await cacheInvalidateTags(`people:${organizationId}`, `org:${organizationId}`);
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

  await cacheInvalidateTags(`people:${organizationId}`, `org:${organizationId}`);

  return getPerson(organizationId, id);
}

export async function ensurePersonForEmail({
  organizationId,
  email,
  name,
  phone,
}: {
  organizationId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
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

    const updates: { name?: string; phone?: string } = {};
    if (shouldUseName) updates.name = name!.trim();
    if (phone?.trim() && !existing.phone) updates.phone = phone.trim();

    if (Object.keys(updates).length > 0) {
      await db
        .update(schema.person)
        .set(updates)
        .where(eq(schema.person.id, existing.id));

      await cacheInvalidateTags(`people:${organizationId}`);
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
    phone: phone?.trim() || null,
  });

  await cacheInvalidateTags(`people:${organizationId}`);

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
