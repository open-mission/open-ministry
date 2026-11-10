"use client";

import { useQuery } from "@tanstack/react-query";

import type { listDepartments } from "@/lib/departments";

export type DepartmentRecord = Awaited<ReturnType<typeof listDepartments>>[number];

export type DepartmentsApiResponse = {
  departments: DepartmentRecord[];
};

export const departmentKeys = {
  all: ["departments"] as const,
  lists: () => [...departmentKeys.all, "list"] as const,
  detail: (id: string) => [...departmentKeys.all, "detail", id] as const,
};

async function fetchDepartments(): Promise<DepartmentsApiResponse> {
  const response = await fetch("/api/departments");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao carregar departamentos.");
  }
  return response.json();
}

export function useDepartmentsQuery(options?: {
  initialData?: DepartmentsApiResponse;
}) {
  return useQuery({
    queryKey: departmentKeys.lists(),
    queryFn: fetchDepartments,
    initialData: options?.initialData,
    staleTime: 60 * 1000,
  });
}
