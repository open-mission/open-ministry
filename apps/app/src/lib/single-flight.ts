const inflight = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent calls for the same key into a single promise.
 *
 * Server components rendering in parallel (layout + page, or sibling Suspense
 * boundaries) often ask for the same cached value at the same time. Without
 * this guard every caller performs its own DB/Redis round trip before the
 * first result reaches the cache.
 *
 * Failed promises are removed immediately so the next caller can retry.
 */
export function singleFlight<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = (async () => {
    try {
      return await fetcher();
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);

  return request;
}
