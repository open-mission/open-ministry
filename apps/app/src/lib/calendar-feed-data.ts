import { listCalendarFeedsAction } from "@/features/calendar/actions/feed.actions";

/** Serializável para os dois pontos de entrada de SettingsView (página e modal). */
export type CalendarFeedView = {
  id: string;
  label: string | null;
  includeServices: boolean;
  includeRehearsals: boolean;
  includeDepartmentEvents: boolean;
  includeAssignments: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

/**
 * Carrega os links do membro sem derrubar as configurações caso a tabela ainda
 * não exista (migration pendente) ou a sessão não esteja vinculada a uma pessoa.
 */
export async function loadCalendarFeedViews(): Promise<CalendarFeedView[]> {
  try {
    const result = await listCalendarFeedsAction();
    if (!result.ok) return [];

    return result.feeds.map((feed) => ({
      id: feed.id,
      label: feed.label,
      includeServices: feed.includeServices,
      includeRehearsals: feed.includeRehearsals,
      includeDepartmentEvents: feed.includeDepartmentEvents,
      includeAssignments: feed.includeAssignments,
      lastUsedAt: feed.lastUsedAt ? feed.lastUsedAt.toISOString() : null,
      createdAt: feed.createdAt.toISOString(),
    }));
  } catch (error) {
    console.warn("[calendar-feed] não foi possível listar os links:", error);
    return [];
  }
}
