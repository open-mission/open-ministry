import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { listDepartments } from "@/lib/departments";
import { isOrganizationModuleEnabled } from "@/lib/permissions/service";
import { invalidateSongCache } from "@/lib/songs";

export type DepartmentArrangement = {
  departmentId: string;
  departmentName: string;
  notes: Record<string, string>;
  selectedFunctionIds: string[];
  functions?: { id: string; name: string }[];
};

const sectionNotesSchema = z
  .record(
    z.string().trim().min(1).max(120),
    z.string().trim().max(2000),
  )
  .refine((notes) => Object.keys(notes).length <= 100, {
    message: "Envie no máximo 100 seções por departamento.",
  });

const formationSchema = z.array(z.string().trim().min(1)).max(100);

/**
 * Departamentos habilitados para o módulo de música e visíveis ao usuário.
 * Administradores enxergam todos; demais membros apenas os departamentos em
 * que participam.
 */
export async function getAccessibleMusicDepartments(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
) {
  const musicEnabled = await isOrganizationModuleEnabled(
    organizationId,
    "music",
  );
  if (!musicEnabled) {
    return [];
  }

  const departments = await listDepartments(organizationId);

  return departments
    .filter((department) =>
      department.modules.some((module) => module.moduleKey === "music"),
    )
    .filter(
      (department) =>
        isAdmin ||
        department.members.some((member) => member.person?.userId === userId),
    );
}

async function assertSongInOrganization(
  organizationId: string,
  songId: string,
) {
  const song = await db.query.song.findFirst({
    where: and(
      eq(schema.song.id, songId),
      eq(schema.song.organizationId, organizationId),
    ),
    columns: { id: true },
  });

  if (!song) {
    throw new Error("Música não encontrada.");
  }

  return song;
}

async function assertDepartmentAccessible(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  departmentId: string,
) {
  const departments = await getAccessibleMusicDepartments(
    organizationId,
    userId,
    isAdmin,
  );

  if (!departments.some((department) => department.id === departmentId)) {
    throw new Error("Departamento indisponível para esta música.");
  }

  return departments;
}

/**
 * Notas por seção e formação da banda de uma música, agrupadas por
 * departamento acessível ao usuário.
 */
export async function getSongArrangements(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  songId: string,
): Promise<DepartmentArrangement[]> {
  await assertSongInOrganization(organizationId, songId);

  const departments = await getAccessibleMusicDepartments(
    organizationId,
    userId,
    isAdmin,
  );
  if (departments.length === 0) {
    return [];
  }

  const departmentIds = departments.map((department) => department.id);

  const [notes, formation] = await Promise.all([
    db.query.songSectionNote.findMany({
      where: and(
        eq(schema.songSectionNote.organizationId, organizationId),
        eq(schema.songSectionNote.songId, songId),
        inArray(schema.songSectionNote.departmentId, departmentIds),
      ),
    }),
    db.query.songFormationFunction.findMany({
      where: and(
        eq(schema.songFormationFunction.organizationId, organizationId),
        eq(schema.songFormationFunction.songId, songId),
        inArray(schema.songFormationFunction.departmentId, departmentIds),
      ),
      orderBy: (row, { asc }) => [asc(row.sortOrder)],
    }),
  ]);

  return departments.map((department) => {
    const departmentNotes: Record<string, string> = {};
    for (const note of notes) {
      if (note.departmentId === department.id) {
        departmentNotes[note.sectionKey] = note.note;
      }
    }

    return {
      departmentId: department.id,
      departmentName: department.name,
      notes: departmentNotes,
      selectedFunctionIds: formation
        .filter((row) => row.departmentId === department.id)
        .map((row) => row.functionId),
      functions: department.functions.map((fn) => ({
        id: fn.id,
        name: fn.name,
      })),
    };
  });
}

/**
 * Substitui as notas por seção de um departamento. Notas vazias (após trim)
 * são removidas.
 */
export async function saveSongSectionNotes(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  songId: string,
  departmentId: string,
  rawNotes: Record<string, string>,
): Promise<void> {
  const parsed = sectionNotesSchema.safeParse(rawNotes);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Notas por seção inválidas.",
    );
  }

  await assertSongInOrganization(organizationId, songId);
  await assertDepartmentAccessible(
    organizationId,
    userId,
    isAdmin,
    departmentId,
  );

  const entries = Object.entries(parsed.data).filter(
    ([, note]) => note.length > 0,
  );

  const deleteNotesQuery = db
    .delete(schema.songSectionNote)
    .where(
      and(
        eq(schema.songSectionNote.organizationId, organizationId),
        eq(schema.songSectionNote.songId, songId),
        eq(schema.songSectionNote.departmentId, departmentId),
      ),
    );

  if (entries.length > 0) {
    await db.batch([
      deleteNotesQuery,
      db.insert(schema.songSectionNote).values(
        entries.map(([sectionKey, note]) => ({
          id: crypto.randomUUID(),
          organizationId,
          songId,
          departmentId,
          sectionKey,
          note,
          updatedById: userId,
        })),
      ),
    ]);
  } else {
    await deleteNotesQuery;
  }

  await invalidateSongCache(organizationId, songId);
}

/**
 * Substitui a formação da banda de um departamento para a música, na ordem
 * enviada. IDs duplicados são ignorados mantendo a primeira ocorrência.
 */
export async function saveSongFormation(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
  songId: string,
  departmentId: string,
  rawFunctionIds: string[],
): Promise<void> {
  const parsed = formationSchema.safeParse(rawFunctionIds);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Formação da banda inválida.",
    );
  }

  const functionIds = Array.from(new Set(parsed.data));

  await assertSongInOrganization(organizationId, songId);
  await assertDepartmentAccessible(
    organizationId,
    userId,
    isAdmin,
    departmentId,
  );

  if (functionIds.length > 0) {
    const departmentFunctions = await db.query.departmentFunction.findMany({
      where: and(
        eq(schema.departmentFunction.departmentId, departmentId),
        inArray(schema.departmentFunction.id, functionIds),
      ),
      columns: { id: true },
    });

    const validFunctionIds = new Set(
      departmentFunctions.map((fn) => fn.id),
    );
    if (functionIds.some((id) => !validFunctionIds.has(id))) {
      throw new Error("Uma das funções não pertence a este departamento.");
    }
  }

  const deleteFormationQuery = db
    .delete(schema.songFormationFunction)
    .where(
      and(
        eq(schema.songFormationFunction.organizationId, organizationId),
        eq(schema.songFormationFunction.songId, songId),
        eq(schema.songFormationFunction.departmentId, departmentId),
      ),
    );

  if (functionIds.length > 0) {
    await db.batch([
      deleteFormationQuery,
      db.insert(schema.songFormationFunction).values(
        functionIds.map((functionId, sortOrder) => ({
          id: crypto.randomUUID(),
          organizationId,
          songId,
          departmentId,
          functionId,
          sortOrder,
        })),
      ),
    ]);
  } else {
    await deleteFormationQuery;
  }

  await invalidateSongCache(organizationId, songId);
}
