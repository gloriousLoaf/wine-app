/**
 * A tiny in-isolate TTL cache for query results that are identical for every
 * visitor.
 *
 * **Nothing depends on this for cost.** It is an opportunistic saving, no more.
 *
 * It used to be the main defence against recomputing collection metadata per
 * request, and that was a mistake worth recording: this is module state inside
 * a Workers isolate, so it is not shared across isolates or colos and vanishes
 * when one is recycled. Measured in production it hit approximately **zero**
 * percent — at a few requests a minute, Workers evicts isolates between
 * requests, so nearly every request arrived on a cold one. An in-isolate cache
 * only pays off during a burst against a single colo, which is the opposite of
 * steady low traffic.
 *
 * The metadata is now materialized in the `collection_meta` table instead, so
 * a miss here costs a single-row primary-key lookup rather than ~3,900 rows.
 * This layer just saves that lookup when it happens to be warm.
 *
 * Do not put per-visitor or per-filter data in here — it is unbounded-key
 * territory and a scraper could grow it without limit. Keys must come from a
 * small fixed set (see CACHE_KEYS).
 */

const TTL_MS = 5 * 60 * 1000;

export const CACHE_KEYS = {
  collectionSnapshot: 'collection-snapshot',
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
