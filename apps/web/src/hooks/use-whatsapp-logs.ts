"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  retryAllFailedEvolutionMessagesAction,
  retryEvolutionMessageAction,
} from "@/app/actions/settings";
import type { EvolutionMessageLogItem } from "@/lib/notification-service";

export type WhatsAppLogsFilters = {
  status?: string;
  search?: string;
  type?: string;
  limit?: number;
  offset?: number;
  batchId?: string;
};

export type WhatsAppLogsResponse = {
  logs: EvolutionMessageLogItem[];
  total: number;
};

export const whatsappLogKeys = {
  all: ["whatsapp-logs"] as const,
  lists: () => [...whatsappLogKeys.all, "list"] as const,
  list: (filters: WhatsAppLogsFilters) =>
    [...whatsappLogKeys.lists(), filters] as const,
};

async function fetchWhatsAppLogs(
  filters: WhatsAppLogsFilters,
): Promise<WhatsAppLogsResponse> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.offset) {
    params.set("offset", String(filters.offset));
  }
  if (filters.batchId) {
    params.set("batchId", filters.batchId);
  }

  const res = await fetch(`/api/whatsapp/logs?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Erro ao carregar histórico de mensagens.",
    );
  }
  return res.json();
}

export function useWhatsAppLogsQuery(
  filters: WhatsAppLogsFilters,
  options?: { initialData?: WhatsAppLogsResponse },
) {
  return useQuery({
    queryKey: whatsappLogKeys.list(filters),
    queryFn: () => fetchWhatsAppLogs(filters),
    placeholderData: keepPreviousData,
    initialData: options?.initialData,
    staleTime: 15 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.logs || data.logs.length === 0) return false;
      const hasActiveMessages = data.logs.some(
        (log) => log.status === "sending" || log.status === "pending",
      );
      return hasActiveMessages ? 3000 : false;
    },
  });
}

export function useRetryWhatsAppMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const res = await retryEvolutionMessageAction(logId);
      if (!res.ok) {
        throw new Error(res.error || "Não foi possível reenviar a mensagem.");
      }
      return res;
    },
    onMutate: async (logId: string) => {
      await queryClient.cancelQueries({ queryKey: whatsappLogKeys.all });

      const previousQueries = queryClient.getQueriesData<WhatsAppLogsResponse>({
        queryKey: whatsappLogKeys.lists(),
      });

      queryClient.setQueriesData<WhatsAppLogsResponse>(
        { queryKey: whatsappLogKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            logs: old.logs.map((log) =>
              log.id === logId
                ? {
                    ...log,
                    status: "sending" as const,
                    lastError: null,
                    attempts: (log.attempts ?? 0) + 1,
                  }
                : log,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (err, _logId, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(err.message || "Erro ao reenviar mensagem.");
    },
    onSuccess: () => {
      toast.success("Mensagem reenviada com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: whatsappLogKeys.all });
    },
  });
}

export function useRetryAllFailedWhatsAppMessagesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId?: string) => {
      return retryAllFailedEvolutionMessagesAction(batchId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: whatsappLogKeys.all });

      const previousQueries = queryClient.getQueriesData<WhatsAppLogsResponse>({
        queryKey: whatsappLogKeys.lists(),
      });

      queryClient.setQueriesData<WhatsAppLogsResponse>(
        { queryKey: whatsappLogKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            logs: old.logs.map((log) =>
              log.status === "failed" || log.status === "pending"
                ? {
                    ...log,
                    status: "sending" as const,
                    lastError: null,
                    attempts: (log.attempts ?? 0) + 1,
                  }
                : log,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(err.message || "Erro ao reprocessar mensagens.");
    },
    onSuccess: (data) => {
      toast.success(
        `Reprocessamento concluído: ${data.sent} enviada(s), ${data.failed} falha(s).`,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: whatsappLogKeys.all });
    },
  });
}
