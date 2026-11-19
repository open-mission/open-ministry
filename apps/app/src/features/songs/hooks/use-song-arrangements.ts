"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  getSongArrangementsAction,
  saveSongFormationAction,
  saveSongSectionNotesAction,
} from "@/features/songs/actions/songs.actions";
import {
  filterAccessibleDepartments,
  getLoadedDepartments,
  type DepartmentArrangement,
  type SongSectionNoteMap,
} from "@/features/songs/lib/song-arrangements";

export type UseSongArrangementsResult = {
  departments: DepartmentArrangement[];
  isLoading: boolean;
  error: string | null;
  savingKey: string | null;
  setNotes: (
    departmentId: string,
    notes: SongSectionNoteMap,
  ) => Promise<boolean>;
  setFormation: (
    departmentId: string,
    functionIds: string[],
  ) => Promise<boolean>;
};

/**
 * Carrega os arranjos (notas por seção + formação) de uma música e expõe as
 * ações de salvamento por departamento. O servidor filtra os departamentos
 * acessíveis; `accessibleDepartmentIds` aplica uma checagem extra no cliente.
 */
export function useSongArrangements(
  songId?: string | null,
  accessibleDepartmentIds?: string[],
): UseSongArrangementsResult {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentArrangement[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Chave serializada: identifica a requisição atual sem depender da identidade
  // do array recebido (que pode mudar a cada render do chamador).
  const accessibleIdsKey = useMemo(
    () => JSON.stringify(accessibleDepartmentIds ?? null),
    [accessibleDepartmentIds],
  );

  const requestKey = songId ? `${songId}::${accessibleIdsKey}` : null;
  const isLoading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!requestKey || !songId) return;

    let cancelled = false;
    const accessibleIds =
      accessibleIdsKey === "null"
        ? undefined
        : (JSON.parse(accessibleIdsKey) as string[]);

    getSongArrangementsAction(songId)
      .then((result) => {
        if (cancelled) return;

        if (result.ok) {
          setDepartments(
            filterAccessibleDepartments(result.departments, accessibleIds),
          );
          setError(null);
        } else {
          setDepartments([]);
          setError(result.error);
        }
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (cancelled) return;
        setDepartments([]);
        setError("Não foi possível carregar as notas e a formação.");
        setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [accessibleIdsKey, requestKey, songId]);

  const setNotes = useCallback(
    async (departmentId: string, notes: SongSectionNoteMap) => {
      if (!songId) return false;

      setSavingKey(`notes:${departmentId}`);
      try {
        const result = await saveSongSectionNotesAction(
          songId,
          departmentId,
          notes,
        );

        if (!result.ok) {
          toast.error(result.error);
          return false;
        }

        setDepartments((current) =>
          current.map((department) =>
            department.departmentId === departmentId
              ? { ...department, notes }
              : department,
          ),
        );
        toast.success("Notas por seção salvas.");
        router.refresh();
        return true;
      } catch {
        toast.error("Não foi possível salvar as notas.");
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [router, songId],
  );

  const setFormation = useCallback(
    async (departmentId: string, functionIds: string[]) => {
      if (!songId) return false;

      setSavingKey(`formation:${departmentId}`);
      try {
        const result = await saveSongFormationAction(
          songId,
          departmentId,
          functionIds,
        );

        if (!result.ok) {
          toast.error(result.error);
          return false;
        }

        setDepartments((current) =>
          current.map((department) =>
            department.departmentId === departmentId
              ? { ...department, selectedFunctionIds: functionIds }
              : department,
          ),
        );
        toast.success("Formação da banda salva.");
        router.refresh();
        return true;
      } catch {
        toast.error("Não foi possível salvar a formação da banda.");
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [router, songId],
  );

  return {
    departments: getLoadedDepartments(departments, requestKey, loadedKey),
    isLoading,
    error,
    savingKey,
    setNotes,
    setFormation,
  };
}
