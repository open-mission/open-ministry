"use server";

// Wrappers async explícitos: arquivos "use server" só podem exportar funções
// assíncronas, então re-exportar (`export { ... } from`) de outro módulo não é
// aceito pelo compilador do Turbopack no build de cliente.
import {
  createSongAction as createSongActionImpl,
  deleteSongAction as deleteSongActionImpl,
  fetchLyricsDetailsAction as fetchLyricsDetailsActionImpl,
  getSongArrangementsAction as getSongArrangementsActionImpl,
  saveSongFormationAction as saveSongFormationActionImpl,
  saveSongSectionNotesAction as saveSongSectionNotesActionImpl,
  searchOnlineSongsAction as searchOnlineSongsActionImpl,
  updateSongAction as updateSongActionImpl,
} from "@/app/actions/songs";
import type { OnlineSongResult } from "@/lib/music/lyrics-service";
import type { SongActionResult } from "@/app/actions/songs";

export async function searchOnlineSongsAction(
  query: string,
): Promise<OnlineSongResult[]> {
  return searchOnlineSongsActionImpl(query);
}

export async function fetchLyricsDetailsAction(
  item: OnlineSongResult,
): Promise<string> {
  return fetchLyricsDetailsActionImpl(item);
}

export async function createSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  return createSongActionImpl(formData);
}

export async function updateSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  return updateSongActionImpl(formData);
}

export async function deleteSongAction(
  input: FormData | string,
): Promise<SongActionResult> {
  return deleteSongActionImpl(input);
}

export async function getSongArrangementsAction(songId: string) {
  return getSongArrangementsActionImpl(songId);
}

export async function saveSongSectionNotesAction(
  songId: string,
  departmentId: string,
  notes: Record<string, string>,
) {
  return saveSongSectionNotesActionImpl(songId, departmentId, notes);
}

export async function saveSongFormationAction(
  songId: string,
  departmentId: string,
  functionIds: string[],
) {
  return saveSongFormationActionImpl(songId, departmentId, functionIds);
}

export type { SongActionResult } from "@/app/actions/songs";
