export type StatusFilter =
  | "all"
  | "missing-chords"
  | "missing-lyrics"
  | "scheduled"
  | "never";

export type SortOption = "manual" | "title" | "usage" | "updated";

export const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  "missing-chords": "Sem cifra",
  "missing-lyrics": "Sem letra",
  scheduled: "Agendadas",
  never: "Nunca usadas",
};

export const SORT_LABEL: Record<SortOption, string> = {
  manual: "Ordem manual",
  title: "Título (A–Z)",
  usage: "Mais usadas",
  updated: "Atualizadas recentemente",
};

export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
