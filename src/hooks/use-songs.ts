"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SongInput } from "@/lib/music/songs-schema";
import type { SongRecord, SongWithDetails } from "@/lib/songs";

export type SongsApiResponse = {
  songs: SongRecord[];
  collections: string[];
};

export type SongApiResponse = {
  song: SongWithDetails;
};

export const songKeys = {
  all: ["songs"] as const,
  lists: () => [...songKeys.all, "list"] as const,
  list: (filters?: { search?: string }) =>
    [...songKeys.lists(), filters ?? {}] as const,
  details: () => [...songKeys.all, "detail"] as const,
  detail: (id: string) => [...songKeys.details(), id] as const,
};

async function fetchSongs(search?: string): Promise<SongsApiResponse> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`/api/songs${query}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao carregar músicas.");
  }

  return response.json();
}

async function fetchSong(songId: string): Promise<SongApiResponse> {
  const response = await fetch(`/api/songs/${encodeURIComponent(songId)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao carregar detalhes da música.");
  }

  return response.json();
}

async function createSongRequest(data: SongInput): Promise<{ song: SongRecord }> {
  const response = await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar música.");
  }

  return response.json();
}

async function updateSongRequest({
  songId,
  data,
}: {
  songId: string;
  data: SongInput;
}): Promise<{ song: SongWithDetails | SongRecord }> {
  const response = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar música.");
  }

  return response.json();
}

async function deleteSongRequest(songId: string): Promise<{ ok: boolean; songId: string }> {
  const response = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir música.");
  }

  return response.json();
}

export function useSongsQuery(options?: {
  search?: string;
  initialData?: SongsApiResponse;
}) {
  return useQuery({
    queryKey: songKeys.list(options?.search ? { search: options.search } : undefined),
    queryFn: () => fetchSongs(options?.search),
    initialData: options?.initialData,
    staleTime: 30 * 1000,
  });
}

export function useSongQuery(
  songId: string,
  options?: { initialData?: SongApiResponse },
) {
  return useQuery({
    queryKey: songKeys.detail(songId),
    queryFn: () => fetchSong(songId),
    initialData: options?.initialData,
    enabled: Boolean(songId),
    staleTime: 30 * 1000,
  });
}

export function useCreateSongMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSongRequest,
    onSuccess: (result) => {
      // Invalida listas e adiciona pré-populado nos detalhes
      queryClient.setQueryData(
        songKeys.detail(result.song.id),
        { song: result.song },
      );
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

export function useUpdateSongMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSongRequest,
    onMutate: async ({ songId, data }) => {
      // 1. Cancelar refetches concorrentes para evitar sobrescrever a atualização otimista
      await queryClient.cancelQueries({ queryKey: songKeys.detail(songId) });
      await queryClient.cancelQueries({ queryKey: songKeys.lists() });

      // 2. Snapshot do estado anterior
      const previousDetail = queryClient.getQueryData<SongApiResponse>(
        songKeys.detail(songId),
      );

      const previousLists = queryClient.getQueriesData<SongsApiResponse>({
        queryKey: songKeys.lists(),
      });

      // 3. Atualização otimista do detalhe da música (0ms na UI)
      if (previousDetail?.song) {
        queryClient.setQueryData<SongApiResponse>(songKeys.detail(songId), {
          song: {
            ...previousDetail.song,
            ...data,
            updatedAt: new Date(),
          },
        });
      }

      // 4. Atualização otimista de todas as listas em cache (0ms na listagem)
      for (const [key, cachedList] of previousLists) {
        if (cachedList?.songs) {
          queryClient.setQueryData<SongsApiResponse>(key, {
            ...cachedList,
            songs: cachedList.songs.map((s) =>
              s.id === songId
                ? {
                    ...s,
                    ...data,
                    updatedAt: new Date(),
                  }
                : s,
            ),
          });
        }
      }

      return { previousDetail, previousLists };
    },
    onError: (_err, { songId }, context) => {
      // Reverter para o estado anterior em caso de erro
      if (context?.previousDetail) {
        queryClient.setQueryData(
          songKeys.detail(songId),
          context.previousDetail,
        );
      }
      if (context?.previousLists) {
        for (const [key, cachedList] of context.previousLists) {
          queryClient.setQueryData(key, cachedList);
        }
      }
    },
    onSettled: (_data, _error, { songId }) => {
      // Sincronizar com o servidor em background
      queryClient.invalidateQueries({ queryKey: songKeys.detail(songId) });
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

export function useDeleteSongMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSongRequest,
    onMutate: async (songId) => {
      await queryClient.cancelQueries({ queryKey: songKeys.lists() });
      await queryClient.cancelQueries({ queryKey: songKeys.detail(songId) });

      const previousLists = queryClient.getQueriesData<SongsApiResponse>({
        queryKey: songKeys.lists(),
      });

      // Remoção otimista em todas as listas de músicas
      for (const [key, cachedList] of previousLists) {
        if (cachedList?.songs) {
          queryClient.setQueryData<SongsApiResponse>(key, {
            ...cachedList,
            songs: cachedList.songs.filter((s) => s.id !== songId),
          });
        }
      }

      return { previousLists };
    },
    onError: (_err, _songId, context) => {
      if (context?.previousLists) {
        for (const [key, cachedList] of context.previousLists) {
          queryClient.setQueryData(key, cachedList);
        }
      }
    },
    onSettled: (_data, _error, songId) => {
      queryClient.removeQueries({ queryKey: songKeys.detail(songId) });
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}
