/**
 * A tiny in-isolate TTL cache for query results that are identical for every
 * visitor.
 *
 * The collection's filter lists, total count and date range only change when a
 * wine is added, edited or deleted from /admin — but they were being recomputed
 * from D1 on every single request, which is most of what was burning the daily
 * read quota.
 *
 * Scope and lifetime: this is module state inside a Workers isolate. It is not
 * shared across isolates or colos, and it disappears when an isolate is
 * recycled. That is fine for the job — the point is that a burst of requests
 * hitting one isolate resolves to one D1 query, not hundreds. Correctness is
 * bounded by TTL_MS: a write from /admin calls invalidate() to clear the isolate
 * that served it, and every other isolate catches up within one TTL window.
 *
 * Do not put per-visitor or per-filter data in here — it is unbounded-key
 * territory and a scraper could grow it without limit. Keys must come from a
 * small fixed set (see CACHE_KEYS).
 */

const TTL_MS = 5 * 60 * 1000;

export const CACHE_KEYS = {
  filterMetadata: 'filter-metadata',
  collectionStats: 'collection-stats',
} as const;

type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

type Entry = { value: unknown; expiresAt: number };

const store = new Map<CacheKey, Entry>();

// Dedupes concurrent misses so a burst against a cold isolate fires one query
// rather than one per in-flight request.
const inFlight = new Map<CacheKey, Promise<unknown>>();

export async function cached<T>(key: CacheKey, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + TTL_MS });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request as Promise<T>;
}

/**
 * Drop cached collection metadata. Called by the admin write actions so the
 * isolate handling the write reflects the change immediately.
 */
export function invalidateCollectionCache(): void {
  store.clear();
}
