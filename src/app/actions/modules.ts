"use server";

import { revalidatePath } from "next/cache";

import { getDepartmentAccess } from "@/lib/departments";
import type { ModuleKey } from "@/lib/modules";
import { setDepartmentModuleEnabled } from "@/lib/modules/service";
import { requireOrganizationContext } from "@/lib/organizations";

export type ToggleDepartmentModuleResult = {
  ok: boolean;
  error?: string;
};

export async function toggleDepartmentModuleAction(
  formData: FormData,
): Promise<ToggleDepartmentModuleResult> {
  const departmentId = formData.get("departmentId");
  const moduleKey = formData.get("moduleKey");
  const enabled = formData.get("enabled") === "true";

  if (typeof departmentId !== "string" || !departmentId) {
    return { ok: false, error: "Departamento inválido." };
  }

  if (typeof moduleKey !== "string" || !moduleKey) {
    return { ok: false, error: "Módulo inválido." };
  }

  const { organization, session, isAdmin } = await requireOrganizationContext();

  const access = await getDepartmentAccess(
    organization.id,
    departmentId,
    session.user.id,
    isAdmin,
  );

  if (!access?.canManage) {
    return {
      ok: false,
      error:
        "Você não tem permissão para gerenciar os módulos deste departamento.",
    };
  }

  try {
    await setDepartmentModuleEnabled(
      organization.id,
      departmentId,
      moduleKey as ModuleKey,
      enabled,
    );

    revalidatePath(`/dashboard/departments/${departmentId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/departments");

    return { ok: true };
  } catch (error) {
    console.error("[toggleDepartmentModuleAction] Erro:", error);
    return { ok: false, error: "Não foi possível atualizar o módulo." };
  }
}
