/** Helpers puros (sem server-only) para o bootstrap de Super Admins por e-mail. */

export function getBootstrapSuperAdminEmails(): string[] {
  return (process.env.PLATFORM_SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export function isBootstrapSuperAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getBootstrapSuperAdminEmails().includes(normalized);
}

/** O papel pode vir como string simples ou lista separada por vírgula. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes("super_admin");
}
