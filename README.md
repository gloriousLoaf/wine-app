# 🍷 wine.metcalf.dev

A minimalist wine collection tracker. 1100+ bottles, personal tasting notes, infinite scroll. Built to be fast and cheap to run.

**Live:** [wine.metcalf.dev](https://wine.metcalf.dev)

---

## Architecture

```
User request
  → Cloudflare edge (wine.metcalf.dev)
    → Cloudflare Worker (Next.js via @opennextjs/cloudflare)
      → D1 database (wines table)
      → R2 bucket (bottle images, served via public CDN URL)
```

| Layer | Service | Notes |
|---|---|---|
| Hosting | Cloudflare Workers | Next.js App Router via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 | SQLite, binding: `wine_db` |
| Image storage | Cloudflare R2 | Bucket: `wine-images`, public CDN access |
| ORM | Drizzle ORM | `drizzle-orm/d1` adapter |
| Styling | Vanilla CSS Modules | Zero component libraries |
| DNS | Cloudflare | Domain registrar + proxied DNS |

The D1 binding is accessed per-request via `getCloudflareContext()` from `@opennextjs/cloudflare` — see [lib/db/index.ts](lib/db/index.ts). Images are served directly from R2's public CDN URL; uploads go through the admin server action via the S3-compatible R2 API.

Auto-deploys on push to `main`.

Edge-level protection (cache rules, rate limiting, bot controls) is dashboard
configuration, not code — see [CLOUDFLARE.md](CLOUDFLARE.md).

---

## Environment Variables

Set on the Worker via `wrangler secret put <NAME> --name wine-app`. Not in `.env` for production.

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password for the `/admin` route |
| `R2_ACCOUNT_ID` | Hex account ID from the R2 S3 endpoint URL |
| `R2_ACCESS_KEY_ID` | R2 API token — Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token — Secret Access Key |
| `R2_BUCKET_NAME` | `wine-images` |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` (from bucket Settings → Public access) |

For local dev, put these in `.dev.vars` (wrangler's local secrets file, gitignored). The R2 credentials use the S3-compatible API — use Access Key ID / Secret Access Key, not the "Token value" shown at R2 token creation (that's for Cloudflare's own API).

---

## Local Development

`npm run dev` uses `initOpenNextCloudflareForDev()` (in `next.config.ts`) to simulate Cloudflare bindings via wrangler's `getPlatformProxy()`. The D1 binding is served from a local SQLite file in `.wrangler/state/`.

**First-time setup — seed local D1 from production:**

```bash
# Export production data
npx wrangler d1 export wine-db --output wines.sql --remote

# Strip SQLite transaction syntax D1 doesn't accept
grep -v "^BEGIN TRANSACTION;\|^COMMIT;\|^PRAGMA" wines.sql > wines-d1.sql

# Import into local D1 (no --remote = writes to .wrangler/state/)
npx wrangler d1 execute wine-db --file wines-d1.sql

# Clean up
rm wines.sql wines-d1.sql
```

Re-run this any time you want to refresh local data from production. Create `.dev.vars` with the env vars above for admin and R2 to work locally.

---

## Scripts

```bash
npm run dev           # Next.js local dev server
npm run preview       # Build worker + wrangler dev (full local simulation)
npm run deploy        # Build worker + deploy to Cloudflare
npm run types         # Regenerate worker-configuration.d.ts from wrangler.jsonc
```

Run `npm run types` after any changes to `wrangler.jsonc` (adding bindings, etc.). The generated `worker-configuration.d.ts` is gitignored.

---

## Database

D1 database name: `wine-db`  
Binding name: `wine_db`  
Schema: [lib/db/schema.ts](lib/db/schema.ts)

### The D1 read budget

D1 bills **rows read**, and the free tier allows 5M/day. That number is easy to
blow through, because a query without a usable index reads the whole table to
return one page. Two rules keep this app cheap:

**1. Every list query must be index-backed.** The indexes in
[lib/db/schema.ts](lib/db/schema.ts) exist so that `WHERE <facet> = ? ORDER BY
date_posted DESC LIMIT n` is an index seek with an early exit (~12 rows read)
rather than a full scan plus a sort (~1,100 rows read, of which 1,088 are
discarded).

The filter dropdowns rely on a less obvious trick. `SELECT DISTINCT country FROM
wines` scans the table, but adding `WHERE country > ''` gives SQLite a range
bound on the indexed column and the plan becomes a distinct-value seek — one row
read per distinct value instead of one per row. Same for `min()`/`max()`, which
are single index seeks *only if* issued as separate statements; selecting both in
one statement forces a scan.

Check a plan before adding a query:

```bash
npx wrangler d1 execute wine-db --remote \
  --command "EXPLAIN QUERY PLAN SELECT * FROM wines WHERE country='France' ORDER BY date_posted DESC LIMIT 12"
```

`SEARCH ... USING INDEX` is good. **`SCAN wines` means you are about to read the
whole table on every request.**

**2. Anything identical for all visitors must not be re-queried per request.**
The filter lists, total count and date range change only when `/admin` writes.
They go through the isolate-level TTL cache in [lib/db/cache.ts](lib/db/cache.ts),
and the admin actions call `invalidateCollectionCache()` on write.

Untrusted paging input is clamped in [lib/query-params.ts](lib/query-params.ts) —
without it, `?limit=1000000` is a full-table export.

### Migrations

Schema lives in [lib/db/schema.ts](lib/db/schema.ts); SQL to apply lives in
`migrations/`.

```bash
# Generate SQL after editing schema.ts
npx drizzle-kit generate

# Apply — local first, then production
npx wrangler d1 execute wine-db --file migrations/0001_add_indexes.sql
npx wrangler d1 execute wine-db --file migrations/0001_add_indexes.sql --remote
```

```bash
# Query production D1
npx wrangler d1 execute wine-db --command "SELECT COUNT(*) FROM wines" --remote

# Dump production D1 to SQL
npx wrangler d1 export wine-db --output wines.sql --remote

# Import SQL into D1 (strip BEGIN TRANSACTION / COMMIT first if from SQLite dump)
grep -v "^BEGIN TRANSACTION;\|^COMMIT;\|^PRAGMA" wines.sql > wines-d1.sql
npx wrangler d1 execute wine-db --file wines-d1.sql --remote
```

---

## Debugging

```bash
# Stream live logs from the production Worker
npx wrangler tail --name wine-app

# Check which secrets are set on the Worker
npx wrangler secret list --name wine-app
```

### Common issues

**Worker returns 500 on all routes, static assets load fine** — you accidentally deployed to Cloudflare Pages instead of Workers. Use `npm run deploy` (CLI), not the Pages dashboard.

**`URL_INVALID: The URL 'undefined'`** — a binding isn't reaching the Worker. Check `wrangler secret list`. The dashboard Variables UI is unreliable; use `wrangler secret put`.

**D1 import fails with `BEGIN TRANSACTION` error** — D1 doesn't accept raw SQLite transaction syntax. Strip it: `grep -v "^BEGIN TRANSACTION;\|^COMMIT;\|^PRAGMA"`.

**TypeScript errors on `env.wine_db`** — regenerate types: `npm run types`. If `D1Database` is still unknown, check that `cloudflare-env.d.ts` exists in the project root.
