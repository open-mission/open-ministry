"use server";

import { revalidatePath } from "next/cache";

import {
  createRehearsal,
  deleteRehearsal,
  getOrSeedDepartmentAlertRules,
  getRehearsalById,
  listDepartmentRehearsals,
  resetDepartmentAlertRules,
  saveDepartmentAlertRules,
  updateRehearsal,
} from "@/features/rehearsals/services/rehearsals-service";
import {
  getAccessibleRehearsalDepartments,
  listAccessibleRehearsals,
} from "@/features/rehearsals/services/rehearsals-global-service";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function permissionError(action: string) {
  return {
    ok: false as const,
    error: `Você não tem permissão para ${action} neste departamento.`,
  };
}

async function getContext() {
  const context = await getOrganizationContext();
  if (!context) {
    throw new Error("Sua sessão expirou ou você não tem uma igreja ativa.");
  }
  return context;
}

function revalidateRehearsalPaths(eventId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rehearsals");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/calendar");
  if (eventId) {
    revalidatePath(`/dashboard/rehearsals/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}`);
  }
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function listRehearsalsAction(
  departmentId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof listDepartmentRehearsals>>>> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) return permissionError("visualizar os ensaios");

    const rehearsals = await listDepartmentRehearsals(
      context.organization.id,
      departmentId,
    );
    return { ok: true, data: rehearsals };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível carregar os ensaios."),
    };
  }
}

export async function listAllRehearsalsAction(
  departmentId?: string,
): Promise<
  ActionResult<{
    rehearsals: Awaited<ReturnType<typeof listAccessibleRehearsals>>;
    departments: Awaited<
      ReturnType<typeof getAccessibleRehearsalDepartments>
    >;
  }>
> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "read");
    if (!allowed) return permissionError("visualizar os ensaios");

    const departments = await getAccessibleRehearsalDepartments(
      context.organization.id,
    );

    if (departmentId && !departments.some((item) => item.id === departmentId)) {
      return permissionError("visualizar os ensaios");
    }

    const rehearsals = await listAccessibleRehearsals(
      context.organization.id,
      departmentId ? [departmentId] : departments.map((item) => item.id),
    );

    return { ok: true, data: { rehearsals, departments } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível carregar os ensaios."),
    };
  }
}

export async function getRehearsalAction(
  departmentId: string,
  eventId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getRehearsalById>>>> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) return permissionError("visualizar este ensaio");

    const rehearsal = await getRehearsalById(
      context.organization.id,
      eventId,
    );
    if (!rehearsal) {
      return { ok: false, error: "Ensaio não encontrado." };
    }

    const belongs = rehearsal.departments.some(
      (item) => item.departmentId === departmentId,
    );
    if (!belongs) {
      return { ok: false, error: "Este ensaio não pertence ao departamento." };
    }

    return { ok: true, data: rehearsal };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível carregar o ensaio."),
    };
  }
}

export async function createRehearsalAction(
  departmentId: string,
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createRehearsal>>>> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "createRehearsal", {
      departmentId,
    });
    if (!allowed) return permissionError("agendar ensaios");

    const rehearsal = await createRehearsal(
      context.organization.id,
      departmentId,
      input,
    );

    revalidateRehearsalPaths(rehearsal?.id);
    return { ok: true, data: rehearsal };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível agendar o ensaio."),
    };
  }
}

export async function updateRehearsalAction(
  departmentId: string,
  eventId: string,
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateRehearsal>>>> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "updateRehearsal", {
      departmentId,
    });
    if (!allowed) return permissionError("editar ensaios");

    const rehearsal = await updateRehearsal(
      context.organization.id,
      departmentId,
      eventId,
      input,
    );

    revalidateRehearsalPaths(eventId);
    return { ok: true, data: rehearsal };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível salvar o ensaio."),
    };
  }
}

export async function deleteRehearsalAction(
  departmentId: string,
  eventId: string,
): Promise<ActionResult<{ ok: true; eventId: string }>> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "deleteRehearsal", {
      departmentId,
    });
    if (!allowed) return permissionError("excluir ensaios");

    const result = await deleteRehearsal(
      context.organization.id,
      departmentId,
      eventId,
    );

    revalidateRehearsalPaths(eventId);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível excluir o ensaio."),
    };
  }
}

export async function listRehearsalAlertRulesAction(
  departmentId: string,
): Promise<
  ActionResult<Awaited<ReturnType<typeof getOrSeedDepartmentAlertRules>>>
> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) return permissionError("visualizar os lembretes");

    const rules = await getOrSeedDepartmentAlertRules(
      context.organization.id,
      departmentId,
    );
    return { ok: true, data: rules };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível carregar os lembretes."),
    };
  }
}

export async function saveRehearsalAlertRulesAction(
  departmentId: string,
  rules: unknown,
): Promise<
  ActionResult<Awaited<ReturnType<typeof saveDepartmentAlertRules>>>
> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "manageAlerts", { departmentId });
    if (!allowed) return permissionError("configurar os lembretes");

    const saved = await saveDepartmentAlertRules(
      context.organization.id,
      departmentId,
      rules,
    );

    revalidateRehearsalPaths();
    return { ok: true, data: saved };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível salvar os lembretes."),
    };
  }
}

export async function resetRehearsalAlertRulesAction(
  departmentId: string,
): Promise<
  ActionResult<Awaited<ReturnType<typeof resetDepartmentAlertRules>>>
> {
  try {
    const context = await getContext();
    const allowed = await can("rehearsals", "manageAlerts", { departmentId });
    if (!allowed) return permissionError("restaurar os lembretes");

    const rules = await resetDepartmentAlertRules(
      context.organization.id,
      departmentId,
    );

    revalidateRehearsalPaths();
    return { ok: true, data: rules };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Não foi possível restaurar os lembretes."),
    };
  }
}
