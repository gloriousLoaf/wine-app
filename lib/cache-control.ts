/**
 * `Cache-Control` for the public collection views — the homepage (`/`, set in
 * next.config.ts) and the wines API (`/api/wines`, set in its route handler).
 *
 * The TTL is deliberately long. It is no longer what bounds staleness: the admin
 * write actions purge the Cloudflare edge cache for the whole hostname, so an
 * added, edited or deleted wine is visible immediately rather than whenever the
 * TTL happens to expire. See `purgeEdgeCache()` in app/admin/actions.ts.
 *
 * A longer TTL is strictly better against crawlers — more of their traffic is
 * absorbed by the edge and never reaches the Worker or D1.
 *
 * **Caveat: a deploy does not purge.** Only admin writes do. If a release changes
 * the markup of the collection view, the edge can keep serving the previous HTML
 * for up to `s-maxage`. After a deploy that changes how these pages look, purge
 * by hostname from the Cloudflare dashboard (Caching → Configuration → Purge
 * Cache → Custom Purge → Hostname → `wine.metcalf.dev`). One hour is chosen to
 * keep that window bounded; raise it only if you also purge on deploy.
 */
export const COLLECTION_CACHE_CONTROL =
  'public, s-maxage=3600, stale-while-revalidate=86400';
