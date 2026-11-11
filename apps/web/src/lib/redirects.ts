/**
 * Only internal paths are accepted as post-login destinations. This prevents
 * an open redirect through the `?redirect=` query parameter.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const path = value.trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return null;
  }

  return path;
}

export function redirectTarget(value: unknown, fallback: string): string {
  return safeRedirectPath(value) ?? fallback;
}

export function withRedirect(path: string, redirectTo?: string | null): string {
  if (!redirectTo) {
    return path;
  }

  return `${path}?redirect=${encodeURIComponent(redirectTo)}`;
}

export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
