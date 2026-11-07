"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getAssignmentWithDepartment,
  getDepartmentAccess,
  getDepartmentMemberWithDepartment,
  getFunctionWithDepartment,
} from "@/lib/departments";
import { EXPERIENCE_LEVELS } from "@/lib/experience";
import { getOrganizationContext } from "@/lib/organizations";
import { getPerson } from "@/lib/people";

export type DepartmentFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        description?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type FunctionFormState =
  | {
      error?: string;
      fieldErrors?: {
        name?: string[];
        description?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type AddMemberFormState =
  | {
      error?: string;
      fieldErrors?: {
        personId?: string[];
        isLeader?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type MemberFunctionFormState =
  | {
      error?: string;
      fieldErrors?: {
        functionId?: string[];
        experienceLevel?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type DepartmentActionResult = {
  ok: boolean;
  error?: string;
};

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max, message).optional(),
  );

const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do departamento.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  description: optionalText(
    800,
    "A descrição pode ter no máximo 800 caracteres.",
  ),
});

const departmentUpdateSchema = departmentSchema.extend({
  departmentId: z.string().trim().min(1, "Departamento inválido."),
});

const functionSchema = z.object({
  departmentId: z.string().trim().min(1, "Departamento inválido."),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da função.")
    .max(60, "O nome pode ter no máximo 60 caracteres."),
  description: optionalText(
    400,
    "A descrição pode ter no máximo 400 caracteres.",
  ),
});

const functionUpdateSchema = functionSchema.extend({
  functionId: z.string().trim().min(1, "Função inválida."),
});

const addMemberSchema = z.object({
  departmentId: z.string().trim().min(1, "Departamento inválido."),
  personId: z.string().trim().min(1, "Escolha uma pessoa."),
  isLeader: z.preprocess(
    (value) => value === "on" || value === "true",
    z.boolean(),
  ),
});

const memberFunctionSchema = z.object({
  departmentMemberId: z.string().trim().min(1, "Pessoa inválida."),
  functionId: z.string().trim().min(1, "Escolha uma função."),
  experienceLevel: z.enum(EXPERIENCE_LEVELS, {
    error: "Escolha um nível de experiência válido.",
  }),
});

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  if (typeof code === "string") {
    return code;
  }

  return errorCode((error as { cause?: unknown }).cause);
}

function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505";
}

async function getManagementContext(departmentId: string) {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    } as const;
  }

  if (!context.session.session.activeOrganizationId) {
    return { error: "Selecione uma igreja antes de continuar." } as const;
  }

  const access = await getDepartmentAccess(
    context.organization.id,
    departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access) {
    return { error: "Departamento não encontrado." } as const;
  }

  if (!access.canManage) {
    return {
      error:
        "Só administradores da igreja e líderes deste departamento podem fazer essa alteração.",
    } as const;
  }

  return { context, access } as const;
}

async function getAdminContext() {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    } as const;
  }

  if (!context.isAdmin) {
    return {
      error: "Só administradores da igreja podem fazer essa alteração.",
    } as const;
  }

  return { context } as const;
}

function revalidateDepartment(departmentId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/departments");
  revalidatePath(`/dashboard/departments/${departmentId}`);
}

export async function createDepartmentAction(
  _state: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { error: result.error };
  }

  const departmentId = randomUUID();

  try {
    await db.insert(schema.department).values({
      id: departmentId,
      organizationId: result.context.organization.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: {
          name: ["Já existe um departamento com esse nome."],
        },
      };
    }

    console.error("Erro ao criar departamento", error);
    return { error: "Não foi possível criar o departamento." };
  }

  revalidateDepartment(departmentId);
  redirect(`/dashboard/departments/${departmentId}`);
}

export async function updateDepartmentAction(
  _state: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const parsed = departmentUpdateSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getManagementContext(parsed.data.departmentId);

  if ("error" in result) {
    return { error: result.error };
  }

  try {
    await db
      .update(schema.department)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .where(eq(schema.department.id, parsed.data.departmentId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: {
          name: ["Já existe um departamento com esse nome."],
        },
      };
    }

    console.error("Erro ao atualizar departamento", error);
    return { error: "Não foi possível salvar o departamento." };
  }

  revalidateDepartment(parsed.data.departmentId);
  return { success: true };
}

export async function deleteDepartmentAction(
  departmentId: string,
): Promise<DepartmentActionResult> {
  if (!departmentId) {
    return { ok: false, error: "Departamento inválido." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const access = await getDepartmentAccess(
    result.context.organization.id,
    departmentId,
    result.context.session.user.id,
    result.context.isAdmin,
  );

  if (!access) {
    return { ok: false, error: "Departamento não encontrado." };
  }

  try {
    await db
      .delete(schema.department)
      .where(eq(schema.department.id, departmentId));
  } catch (error) {
    console.error("Erro ao excluir departamento", error);
    return { ok: false, error: "Não foi possível excluir o departamento." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/departments");

  return { ok: true };
}

export async function createFunctionAction(
  _state: FunctionFormState,
  formData: FormData,
): Promise<FunctionFormState> {
  const parsed = functionSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getManagementContext(parsed.data.departmentId);

  if ("error" in result) {
    return { error: result.error };
  }

  try {
    await db.insert(schema.departmentFunction).values({
      id: randomUUID(),
      departmentId: parsed.data.departmentId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { name: ["Já existe uma função com esse nome."] },
      };
    }

    console.error("Erro ao criar função", error);
    return { error: "Não foi possível criar a função." };
  }

  revalidateDepartment(parsed.data.departmentId);
  return { success: true };
}

export async function updateFunctionAction(
  _state: FunctionFormState,
  formData: FormData,
): Promise<FunctionFormState> {
  const parsed = functionUpdateSchema.safeParse({
    departmentId: formData.get("departmentId"),
    functionId: formData.get("functionId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getManagementContext(parsed.data.departmentId);

  if ("error" in result) {
    return { error: result.error };
  }

  const target = await getFunctionWithDepartment(parsed.data.functionId);

  if (
    !target ||
    target.departmentId !== parsed.data.departmentId ||
    target.department.organizationId !== result.context.organization.id
  ) {
    return { error: "Função não encontrada neste departamento." };
  }

  try {
    await db
      .update(schema.departmentFunction)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .where(eq(schema.departmentFunction.id, parsed.data.functionId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { name: ["Já existe uma função com esse nome."] },
      };
    }

    console.error("Erro ao atualizar função", error);
    return { error: "Não foi possível salvar a função." };
  }

  revalidateDepartment(parsed.data.departmentId);
  return { success: true };
}

export async function deleteFunctionAction(
  functionId: string,
): Promise<DepartmentActionResult> {
  if (!functionId) {
    return { ok: false, error: "Função inválida." };
  }

  const target = await getFunctionWithDepartment(functionId);

  if (!target) {
    return { ok: false, error: "Função não encontrada." };
  }

  const result = await getManagementContext(target.departmentId);

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (target.department.organizationId !== result.context.organization.id) {
    return { ok: false, error: "Função não encontrada." };
  }

  try {
    await db
      .delete(schema.departmentFunction)
      .where(eq(schema.departmentFunction.id, functionId));
  } catch (error) {
    console.error("Erro ao excluir função", error);
    return { ok: false, error: "Não foi possível excluir a função." };
  }

  revalidateDepartment(target.departmentId);
  return { ok: true };
}

export async function addDepartmentMemberAction(
  _state: AddMemberFormState,
  formData: FormData,
): Promise<AddMemberFormState> {
  const parsed = addMemberSchema.safeParse({
    departmentId: formData.get("departmentId"),
    personId: formData.get("personId"),
    isLeader: formData.get("isLeader"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getManagementContext(parsed.data.departmentId);

  if ("error" in result) {
    return { error: result.error };
  }

  const person = await getPerson(
    result.context.organization.id,
    parsed.data.personId,
  );

  if (!person) {
    return { error: "Essa pessoa não faz parte da igreja." };
  }

  const isLeader = result.context.isAdmin && parsed.data.isLeader;

  try {
    await db.insert(schema.departmentMember).values({
      id: randomUUID(),
      departmentId: parsed.data.departmentId,
      personId: parsed.data.personId,
      isLeader,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Essa pessoa já faz parte do departamento." };
    }

    console.error("Erro ao adicionar pessoa ao departamento", error);
    return { error: "Não foi possível adicionar a pessoa." };
  }

  revalidateDepartment(parsed.data.departmentId);
  return { success: true };
}

export async function removeDepartmentMemberAction(
  memberId: string,
): Promise<DepartmentActionResult> {
  if (!memberId) {
    return { ok: false, error: "Pessoa inválida." };
  }

  const target = await getDepartmentMemberWithDepartment(memberId);

  if (!target) {
    return { ok: false, error: "Pessoa não encontrada no departamento." };
  }

  const result = await getManagementContext(target.departmentId);

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (target.department.organizationId !== result.context.organization.id) {
    return { ok: false, error: "Pessoa não encontrada no departamento." };
  }

  try {
    await db
      .delete(schema.departmentMember)
      .where(eq(schema.departmentMember.id, memberId));
  } catch (error) {
    console.error("Erro ao remover pessoa do departamento", error);
    return { ok: false, error: "Não foi possível remover a pessoa." };
  }

  revalidateDepartment(target.departmentId);
  return { ok: true };
}

export async function setDepartmentLeaderAction(
  memberId: string,
  isLeader: boolean,
): Promise<DepartmentActionResult> {
  if (!memberId) {
    return { ok: false, error: "Pessoa inválida." };
  }

  const target = await getDepartmentMemberWithDepartment(memberId);

  if (!target) {
    return { ok: false, error: "Pessoa não encontrada no departamento." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (target.department.organizationId !== result.context.organization.id) {
    return { ok: false, error: "Pessoa não encontrada no departamento." };
  }

  try {
    await db
      .update(schema.departmentMember)
      .set({ isLeader })
      .where(eq(schema.departmentMember.id, memberId));
  } catch (error) {
    console.error("Erro ao atualizar liderança do departamento", error);
    return { ok: false, error: "Não foi possível atualizar a liderança." };
  }

  revalidateDepartment(target.departmentId);
  return { ok: true };
}

export async function addMemberFunctionAction(
  _state: MemberFunctionFormState,
  formData: FormData,
): Promise<MemberFunctionFormState> {
  const parsed = memberFunctionSchema.safeParse({
    departmentMemberId: formData.get("departmentMemberId"),
    functionId: formData.get("functionId"),
    experienceLevel: formData.get("experienceLevel"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const member = await getDepartmentMemberWithDepartment(
    parsed.data.departmentMemberId,
  );

  if (!member) {
    return { error: "Pessoa não encontrada no departamento." };
  }

  const result = await getManagementContext(member.departmentId);

  if ("error" in result) {
    return { error: result.error };
  }

  const targetFunction = await getFunctionWithDepartment(
    parsed.data.functionId,
  );

  if (
    !targetFunction ||
    targetFunction.departmentId !== member.departmentId ||
    targetFunction.department.organizationId !== result.context.organization.id
  ) {
    return { error: "Função não encontrada neste departamento." };
  }

  try {
    await db
      .insert(schema.departmentMemberFunction)
      .values({
        id: randomUUID(),
        departmentMemberId: parsed.data.departmentMemberId,
        functionId: parsed.data.functionId,
        experienceLevel: parsed.data.experienceLevel,
      })
      .onConflictDoUpdate({
        target: [
          schema.departmentMemberFunction.departmentMemberId,
          schema.departmentMemberFunction.functionId,
        ],
        set: { experienceLevel: parsed.data.experienceLevel },
      });
  } catch (error) {
    console.error("Erro ao atribuir função", error);
    return { error: "Não foi possível atribuir a função." };
  }

  revalidateDepartment(member.departmentId);
  return { success: true };
}

export async function updateExperienceAction(
  assignmentId: string,
  experienceLevel: string,
): Promise<DepartmentActionResult> {
  if (!assignmentId) {
    return { ok: false, error: "Atribuição inválida." };
  }

  if (
    !EXPERIENCE_LEVELS.includes(
      experienceLevel as (typeof EXPERIENCE_LEVELS)[number],
    )
  ) {
    return { ok: false, error: "Nível de experiência inválido." };
  }

  const assignment = await getAssignmentWithDepartment(assignmentId);

  if (!assignment) {
    return { ok: false, error: "Atribuição não encontrada." };
  }

  const result = await getManagementContext(assignment.member.departmentId);

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (
    assignment.member.department.organizationId !==
    result.context.organization.id
  ) {
    return { ok: false, error: "Atribuição não encontrada." };
  }

  try {
    await db
      .update(schema.departmentMemberFunction)
      .set({ experienceLevel })
      .where(eq(schema.departmentMemberFunction.id, assignmentId));
  } catch (error) {
    console.error("Erro ao atualizar experiência", error);
    return { ok: false, error: "Não foi possível atualizar a experiência." };
  }

  revalidateDepartment(assignment.member.departmentId);
  return { ok: true };
}

export async function removeMemberFunctionAction(
  assignmentId: string,
): Promise<DepartmentActionResult> {
  if (!assignmentId) {
    return { ok: false, error: "Atribuição inválida." };
  }

  const assignment = await getAssignmentWithDepartment(assignmentId);

  if (!assignment) {
    return { ok: false, error: "Atribuição não encontrada." };
  }

  const result = await getManagementContext(assignment.member.departmentId);

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  if (
    assignment.member.department.organizationId !==
    result.context.organization.id
  ) {
    return { ok: false, error: "Atribuição não encontrada." };
  }

  try {
    await db
      .delete(schema.departmentMemberFunction)
      .where(eq(schema.departmentMemberFunction.id, assignmentId));
  } catch (error) {
    console.error("Erro ao remover função", error);
    return { ok: false, error: "Não foi possível remover a função." };
  }

  revalidateDepartment(assignment.member.departmentId);
  return { ok: true };
}
