# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Edge cache purge on admin write

### Added
- `purgeEdgeCache()` in the admin write actions. Adding, editing or deleting a
  wine now purges the Cloudflare edge cache for `wine.metcalf.dev`, so the change
  is visible immediately instead of whenever the cache TTL happened to expire.
  Purging by hostname rather than by URL is deliberate: the cache key includes
  the query string, so every filter combination — and every Next.js `_rsc`
  variant of each — is its own cache entry, with no practical URL list to
  enumerate and no wildcard support in single-URL purge.
  - Failure is logged and swallowed. The write has already committed, so a purge
    that did not go through is a staleness problem, not a reason to report the
    edit as failed. Verified by pointing it at credentials that cannot work and
    confirming the write still persists and the admin sees no error.
  - Deferred with `ctx.waitUntil()` so saving does not wait on Cloudflare, and
    skipped entirely when `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_PURGE_TOKEN` are
    unset, which keeps local dev working without credentials.

### Changed
- Edge TTL for the collection views raised from 5 minutes to 1 hour
  (`stale-while-revalidate` from 1 hour to 1 day). Staleness is now bounded by
  the purge above rather than by the TTL, so a longer TTL is strictly better —
  more crawler traffic is absorbed at the edge and never reaches the Worker.
- The `Cache-Control` value moved to `lib/cache-control.ts`, shared by
  `next.config.ts` and the wines API route, which previously declared it twice
  and could drift.
- `.open-next/**` added to the ESLint ignores. It is generated build output, so
  `npm run lint` failed on bundled vendor code for anyone who had built the
  worker.

### Known limitation
- A **deploy** does not purge — only admin writes do. A release that changes the
  markup of the collection view can serve stale HTML for up to an hour; purge by
  hostname from the dashboard afterwards. Documented in the README.

## [Unreleased] - D1 read-cost and abuse hardening

Context: the daily D1 read quota (5M rows) was being exhausted several days in a
row. The trigger was crawler traffic; the cause was that a single collection view
cost roughly 4,400 row reads, so the quota ran out at around 1,100 page views.

### Fixed
- **Indexed every list query.** The `wines` table had no indexes, so every query
  in the app — the collection view, each infinite-scroll page, the filter
  dropdowns, the stat cards — was a full table scan. Added indexes on
  `date_posted` and on `(country|grape|vintage, date_posted)`, which turn a
  filtered page from a 1,100-row scan-and-sort into a ~12-row index seek.
- **Reshaped the metadata queries.** The filter dropdowns now use
  `SELECT DISTINCT <col> ... WHERE <col> > ''`, whose range bound makes SQLite
  seek distinct values (one row per distinct value) instead of scanning. `min()`
  and `max()` are issued as separate statements so each resolves to a single
  index seek.
- **Stopped recomputing per-visitor-identical data on every request.** Filter
  lists, total count and collection date range are served from an isolate-level
  TTL cache and invalidated on admin writes.
- **`/admin/edit` no longer reads the database without a password.** It ran its
  queries (~2 full table scans) during server render before any auth check, so
  anyone who found the URL could spend the read quota. The list is now fetched
  through a password-checked server action.

### Security
- Clamped and normalized all public query parameters. `limit` previously went
  through a bare `parseInt` straight into the query builder, making
  `?limit=1000000` an unauthenticated full-table export; `NaN` could also reach
  the query. Page size, offset, facet length and search length are now bounded.
- Escaped `%` and `_` in search terms with an explicit `ESCAPE` clause. They were
  being passed to `LIKE` as wildcards, so a search for `50%` matched every row.
- Centralized the admin password check into a single gate covering reads as well
  as writes, using a timing-safe comparison.
- `/admin` responses now send `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

### Added
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600` on the
  collection view and wines API, so the Cloudflare edge can absorb repeat
  traffic without invoking the Worker. Requires the Cache Rules documented in
  [CLOUDFLARE.md](CLOUDFLARE.md).
- `migrations/` directory with the index migration, and a README section on
  keeping queries index-backed.

### Changed
- `getTotalWinesCount()` and `getBottleStats()` are replaced by a single cached
  `getCollectionStats()`.
- `drizzle.config.ts` pointed at Turso, which was removed in the D1 migration.
  Now configured for generating SQLite migrations, which wrangler applies.

## [1.0.0] - Wine App Rebuild

### Added
- **Next.js 15 (App Router)**: Migrated the framework to Next.js for SSR, optimal performance, and superior image handling with `next/image`.
- **Turso (Edge SQLite) & Drizzle ORM**: Upgraded the database layer to a globally distributed, persistent edge SQLite database.
- **Vercel Blob Storage**: Shifted ~1,000+ local and remote images to edge storage, ensuring permanent, high-performance URLs for all wines.
- **Admin Interface**: Introduced a password-protected `/admin` route utilizing Next.js Server Actions to add new wine entries and upload images directly to Vercel Blob.
- **Robust Image Resolution Data Seeder**: Built a seeder with fuzzy-matching logic to resolve naming inconsistencies and maintain remote Cloudfront fallbacks for missing local files, achieving zero broken images.
- **Minimalist Aesthetic**: Engineered a new "stark, modern" design system using Vanilla CSS and CSS Modules exclusively (zero component libraries).
- **Infinite Scroll**: Integrated a Custom Intersection Observer to incrementally load wine cards (12 at a time), guaranteeing swift initial page loads.
- **Native Dialog Components**: Used the native HTML `<dialog>` element for the wine detail view and filter module to optimize bundle size.
- **Dark/Light Mode Theme**: Added a persistent, CSS-variable-based theme switch system.
- **URL-Based State & Debounced Search**: Synchronized search and filter operations (Country, Grape, Vintage) with URL search parameters for shareable views, featuring a 500ms debounce on the sticky bottom search bar.
