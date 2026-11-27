import { PlatformAccessError } from "@/lib/platform/auth";

export type PlatformGuardFailureRedirect = "/login" | "/";

/**
 * Resolve o destino de redirecionamento quando o acesso ao painel /platform falha.
 * Sem sessão -> /login; sessão comum, não super_admin ou em impersonação -> /.
 */
export function resolvePlatformGuardRedirect(
  hasSession: boolean,
  error: unknown,
): PlatformGuardFailureRedirect | null {
  if (!hasSession) {
    return "/login";
  }
  if (error instanceof PlatformAccessError) {
    return "/";
  }
  return error ? "/" : null;
}

export function isPlatformAccessDenied(error: unknown): boolean {
  return (
    error instanceof PlatformAccessError ||
    (error instanceof Error && error.name === "PlatformAccessError")
  );
}
