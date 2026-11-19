/**
 * Canonical tab slugs for each page, mirroring the values used by the
 * `Tabs` components. Pages can filter these lists by permission before
 * resolving a `?tab=` value.
 */
export const PAGE_TAB_VALUES = {
  emails: ["history", "templates"],
  jobs: ["all", "active", "completed", "failed"],
  members: ["list", "felicitometro"],
  memberDetail: ["schedules", "mood", "unavailability"],
  departmentDetail: ["team", "settings", "rehearsals"],
  tasks: ["personal", "delegated", "department", "all"],
  eventDetail: ["order", "teams"],
  announcementsConsole: ["app", "push", "whatsapp"],
} as const;

function stripSurroundingQuotes(value: string): string {
  let normalized = value;

  while (normalized.length >= 2) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    const isDoubleQuoted = first === '"' && last === '"';
    const isSingleQuoted = first === "'" && last === "'";

    if (!isDoubleQuoted && !isSingleQuoted) break;

    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

/**
 * Sanitizes a `?tab=` value coming from `searchParams`.
 *
 * Uses the first item of an array, trims whitespace and strips surrounding
 * quotes (so `?tab=""` or `?tab="templates"` resolve correctly). Returns
 * `null` when nothing usable remains.
 */
export function normalizeTabParam(
  raw: string | string[] | undefined | null,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string") return null;

  const normalized = stripSurroundingQuotes(value.trim());

  return normalized.length > 0 ? normalized : null;
}

/**
 * Resolves a `?tab=` value against the tabs the current user may access,
 * falling back when the value is missing or not allowed.
 */
export function resolveAllowedTab<T extends string>(
  raw: string | string[] | undefined | null,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = normalizeTabParam(raw);

  if (normalized && (allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }

  return fallback;
}

export interface BuildTabHrefOptions {
  defaultTab?: string;
  searchParams?: string | URLSearchParams | null;
}

/**
 * Builds a tab link that preserves the other query params from the current
 * URL. The `tab` param is removed when it is empty or matches `defaultTab`,
 * keeping the pathname clean when no params remain.
 */
export function buildTabHref(
  pathname: string,
  tab: string,
  options: BuildTabHrefOptions = {},
): string {
  const params = new URLSearchParams();
  const source = options.searchParams;

  if (source) {
    const search =
      typeof source === "string" ? source.replace(/^\?/, "") : source;

    for (const [key, value] of new URLSearchParams(search)) {
      params.append(key, value);
    }
  }

  const normalizedTab = tab.trim();

  if (normalizedTab.length === 0 || normalizedTab === options.defaultTab) {
    params.delete("tab");
  } else {
    params.set("tab", normalizedTab);
  }

  const query = params.toString();

  return query.length > 0 ? `${pathname}?${query}` : pathname;
}
