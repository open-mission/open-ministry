"use client";

import { useQuery } from "@tanstack/react-query";

import type { listPeople } from "@/lib/people";

export type PersonRecord = Awaited<ReturnType<typeof listPeople>>[number];

export type PeopleApiResponse = {
  people: PersonRecord[];
};

export const peopleKeys = {
  all: ["people"] as const,
  lists: () => [...peopleKeys.all, "list"] as const,
  detail: (id: string) => [...peopleKeys.all, "detail", id] as const,
};

async function fetchPeople(): Promise<PeopleApiResponse> {
  const response = await fetch("/api/people");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao carregar pessoas.");
  }
  return response.json();
}

export function usePeopleQuery(options?: { initialData?: PeopleApiResponse }) {
  return useQuery({
    queryKey: peopleKeys.lists(),
    queryFn: fetchPeople,
    initialData: options?.initialData,
    staleTime: 60 * 1000,
  });
}
