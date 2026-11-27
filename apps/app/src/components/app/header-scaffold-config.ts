import { isMobileNavRoute } from "./nav-config";

export type HeaderScaffoldLevel =
  | "root-tab"
  | "explore"
  | "detail"
  | "immersive";

/**
 * Normaliza o pathname removendo o prefixo legado `/dashboard` quando presente.
 */
export function normalizeAppPathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  if (pathname === "/dashboard") return "/";
  if (pathname.startsWith("/dashboard/")) {
    return pathname.slice("/dashboard".length);
  }
  return pathname;
}

/**
 * Resolve dinamicamente o nível do Header Scaffold a partir da rota atual:
 * - `root-tab`: abas principais da barra inferior (`/`, `/schedules`, `/calendar`, `/songs`)
 * - `explore`: áreas de 1º nível acessadas pelo menu Explorar (`/departments`, `/members`, etc.)
 * - `detail`: páginas internas/detalhe empilhadas (`/songs/[id]`, `/events/[id]`, etc.)
 */
export function resolveHeaderScaffoldLevel(
  pathname: string | null | undefined,
): HeaderScaffoldLevel {
  const normalized = normalizeAppPathname(pathname);

  if (isMobileNavRoute(normalized)) {
    return "root-tab";
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "explore";
  }

  return "detail";
}
