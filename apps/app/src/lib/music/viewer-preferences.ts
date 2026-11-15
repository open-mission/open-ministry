/**
 * Preferências de leitura do músico (tamanho de fonte e modo de visão).
 * Persistem em localStorage e são compartilhadas entre cifra e letra.
 */

export const VIEWER_FONT_SIZES = ["sm", "base", "lg", "xl"] as const;
export type ViewerFontSize = (typeof VIEWER_FONT_SIZES)[number];

export const CHORDS_FONT_SIZE_KEY = "openministry:songs:viewer:font-size";
export const CHORDS_VIEW_MODE_KEY = "openministry:songs:viewer:view-mode";
export const LYRICS_FONT_SIZE_KEY = "openministry:songs:lyrics:font-size";

/**
 * Lê uma preferência salva apenas se ela ainda for válida.
 */
export function readStoredPreference<T extends string>(
  key: string,
  allowed: readonly T[],
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : null;
  } catch {
    return null;
  }
}

/**
 * Salva uma preferência ignorando ambientes sem armazenamento (modo privado).
 */
export function persistPreference(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponível — a preferência vale apenas nesta sessão.
  }
}

/**
 * Avança ou recua o tamanho de fonte sem sair dos limites disponíveis.
 */
export function shiftFontSize(
  current: ViewerFontSize,
  direction: 1 | -1,
): ViewerFontSize {
  const index = VIEWER_FONT_SIZES.indexOf(current);
  const nextIndex = Math.min(
    VIEWER_FONT_SIZES.length - 1,
    Math.max(0, index + direction),
  );
  return VIEWER_FONT_SIZES[nextIndex] ?? current;
}

/**
 * Descreve o tamanho atual para leitores de tela (ex: "Tamanho da fonte: médio").
 */
export const VIEWER_FONT_SIZE_LABELS: Record<ViewerFontSize, string> = {
  sm: "Pequeno",
  base: "Médio",
  lg: "Grande",
  xl: "Muito grande",
};
