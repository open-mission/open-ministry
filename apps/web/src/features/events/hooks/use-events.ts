"use client";

import { useQuery } from "@tanstack/react-query";

import type { listEvents } from "@/lib/events";

export type EventRecord = Awaited<ReturnType<typeof listEvents>>[number];

export type EventsApiResponse = {
  events: EventRecord[];
  upcoming: EventRecord[];
  past: EventRecord[];
};

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
};

async function fetchEvents(): Promise<EventsApiResponse> {
  const response = await fetch("/api/events");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao carregar eventos.");
  }
  return response.json();
}

export function useEventsQuery(options?: { initialData?: EventsApiResponse }) {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: fetchEvents,
    initialData: options?.initialData,
    staleTime: 60 * 1000,
  });
}
