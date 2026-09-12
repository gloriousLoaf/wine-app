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
configuration, not code — see [Edge configuration](#edge-configuration-cloudflare-dashboard).

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
| `CLOUDFLARE_ZONE_ID` | Zone ID for `metcalf.dev` (zone overview page, right sidebar) |
| `CLOUDFLARE_PURGE_TOKEN` | API token scoped to **Zone → Cache Purge → Purge** on that zone only |

For local dev, put these in `.dev.vars` (wrangler's local secrets file, gitignored). The R2 credentials use the S3-compatible API — use Access Key ID / Secret Access Key, not the "Token value" shown at R2 token creation (that's for Cloudflare's own API).

Note that `wrangler secret put` values are **runtime-only**. The build
environment has its own separate variables — see
[Edge configuration](#edge-configuration-cloudflare-dashboard).

The two `CLOUDFLARE_*` values are for purging the edge cache after an admin write — see [Edge caching](#edge-caching). They are optional: if either is unset the purge is skipped silently and everything else still works, which is why local dev does not need them. Create the token under My Profile → API Tokens → Create Token → Custom token, with that single permission and Zone Resources limited to `metcalf.dev`. Do not use the Global API Key.

---

## Edge configuration (Cloudflare dashboard)

None of this lives in the repo. It is zone configuration, recorded here because
the app depends on it and nothing in the codebase reveals it — if the zone were
ever rebuilt, this is what would have to be recreated.

### The zone is shared — every rule needs a hostname predicate

`wine.metcalf.dev` is a DNS record inside the `metcalf.dev` zone, not a zone of
its own, and Cloudflare rules are scoped to the **zone**. An expression like
`http.request.uri.path eq "/"` matches the portfolio at `metcalf.dev` exactly as
readily as it matches the wine app.

**Every rule below therefore carries `http.host eq "wine.metcalf.dev"`. Do not
drop it.** A rate limit without it would throttle the portfolio; a cache rule
without it would cache pages this repo does not own.

### Caching → Cache Rules

Evaluated top to bottom, so the bypass has to be first.

| # | Rule | Expression | Then |
|---|---|---|---|
| 1 | Bypass cache for admin | `(http.host eq "wine.metcalf.dev" and starts_with(http.request.uri.path, "/admin"))` | Bypass cache |
| 2 | Cache collection views | `(http.host eq "wine.metcalf.dev" and (http.request.uri.path eq "/" or http.request.uri.path eq "/api/wines"))` | Eligible for cache · Edge TTL *use cache-control header if present* · Browser TTL *respect origin* |

Rule 2 leaves the **cache key at its default**, which includes the query string.
That is load-bearing, not incidental — see [Edge caching](#edge-caching).

### Security → WAF → Rate limiting rules

One rule, which is all the free plan allows.

`Throttle wine app browsing` — 20 requests / 10 seconds per **IP address**,
action **Managed Challenge**, mitigation timeout 10 seconds:

```
(http.host eq "wine.metcalf.dev" and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/api/")))
```

Managed Challenge rather than Block on purpose: a challenge is recoverable for a
real person on a shared or mobile IP, a block is not.

### Security → Bots, and the AI-crawler rule

**Bot Fight Mode is on, and it is zone-wide** — there is no hostname filter, so
it applies to `metcalf.dev` too. That is accepted: it only challenges traffic
already scored as automated, so a static portfolio is barely affected. It *can*
break non-browser access (curl, RSS tooling, uptime monitors) across the whole
zone — if you ever point an uptime check at either hostname, add a WAF skip rule
for it.

**"Block AI Scrapers and Crawlers" is deliberately left off.** That toggle is
also zone-wide and would cut AI crawlers off from the portfolio, which benefits
from being found. A scoped WAF custom rule does the same job for the wine app
only — **Security → WAF → Custom rules**, action **Block** (one of five allowed
on the free plan):

```
(http.host eq "wine.metcalf.dev") and (http.user_agent contains "GPTBot" or http.user_agent contains "ClaudeBot" or http.user_agent contains "CCBot" or http.user_agent contains "Bytespider" or http.user_agent contains "PerplexityBot" or http.user_agent contains "meta-externalagent" or http.user_agent contains "Amazonbot" or http.user_agent contains "Applebot-Extended" or http.user_agent contains "Google-Extended")
```

`public/robots.txt` is already `Disallow: /`, so this changes nothing about
intent — it enforces it against crawlers that ignore robots.txt, which are the
ones that caused the problem. Being user-agent matching, it needs occasional
maintenance: add to the list when a new crawler shows up in the logs.

### Settings → Build

Deploy commands and build variables, including why they are separate from
runtime secrets, are documented under
[Edge caching](#deploys-purge-too-but-two-pieces-of-dashboard-config-make-it-work).

### Checking it still holds

```bash
# Wine app: first request MISS, second should be HIT
curl -sI "https://wine.metcalf.dev/?country=France" | grep -i cf-cache-status
curl -sI "https://wine.metcalf.dev/?country=France" | grep -i cf-cache-status

# Admin must never cache — expect BYPASS (or DYNAMIC)
curl -sI "https://wine.metcalf.dev/admin" | grep -i cf-cache-status

# The portfolio must be untouched by any of these rules
curl -sI "https://metcalf.dev/" | grep -i cf-cache-status
```

For whether it is actually working, the number that matters is **rows read** in
**Workers & Pages → D1 → wine-db → Metrics**. Per collection view, roughly:

| | Rows read |
|---|---|
| Before any of this | ~4,400 |
| Indexed, warm isolate | ~12–24 |
| Edge cache hit | 0 — never reaches the Worker |

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

### Edge caching

The collection view (`/`) and the wines API are cached at the Cloudflare edge.
An edge hit never invokes the Worker, so it never reaches D1 — this is what
absorbs crawler traffic. The header comes from
[lib/cache-control.ts](lib/cache-control.ts), used by both `next.config.ts` and
the API route so the two cannot drift. It only has any effect because a Cache
Rule marks those paths eligible; see
[Edge configuration](#edge-configuration-cloudflare-dashboard).

The TTL is an hour, which is safe because **it is not what bounds staleness**.
The admin write actions call `purgeEdgeCache()`
([app/admin/actions.ts](app/admin/actions.ts)), which purges the edge cache for
`wine.metcalf.dev` so an added or edited wine appears immediately. That is the
trade the long TTL depends on: purge for freshness, long TTL for cheapness.

It purges by **hostname**, not by URL, because the cache key includes the query
string — every filter combination, and every Next.js `_rsc` variant of each, is
a separate cache entry. There is no practical URL list to enumerate.

#### Deploys purge too — but two pieces of dashboard config make it work

Admin writes purge from the Worker at runtime. Deploys purge through
[scripts/purge-cache.mjs](scripts/purge-cache.mjs). Without it, a release that
changed the *markup* of the collection view would serve the previous HTML for up
to an hour.

Production does not deploy via `npm run deploy` — it uses **Cloudflare Workers
Builds**, whose commands live in the dashboard, not in this repo
(**Workers & Pages → wine-app → Settings → Build**):

| Field | Value |
|---|---|
| Build command | `npm run build:worker` |
| Deploy command | `npx wrangler deploy && npm run purge` |

**The `&& npm run purge` is the whole point.** Without it the script never runs
on a real deploy, no matter what `package.json` says — `npm run deploy` only
covers manual deploys from a laptop.

The second catch: **build-time variables are not the same as runtime secrets.**
The `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_PURGE_TOKEN` set with
`wrangler secret put` are only visible to the running Worker. The deploy script
runs in the *build* environment and needs its own copies, set under
**Settings → Build → Variables and Secrets**.

Use a *separate* purge token for the build rather than reusing the Worker's.
Cloudflare shows a token's value only once at creation, so the Worker's cannot be
read back anyway — and one token per consumer means either can be revoked without
breaking the other.

If they are missing the script prints a warning and exits 0, so the deploy still
succeeds — it just leaves the cache stale. Watch for that warning in the build
log. To purge by hand:

**Caching → Configuration → Purge Cache → Custom Purge → Hostname →
`wine.metcalf.dev`**

If the purge is attempted and fails, the script exits non-zero and the build goes
red on purpose — a silently stale cache is the thing this exists to prevent. The
Worker has already deployed at that point; only the purge failed.

You can also run it on its own: `npm run purge`.

#### Gotcha: do not remove the query string from the cache key

Cloudflare's default cache key includes it, and Next.js client-side navigations
re-request the same path with `?_rsc=<hash>` to receive an RSC payload rather
than HTML. The query string is what keeps those two variants under separate
keys. Strip it and the edge can serve an RSC payload to a browser navigation,
which renders as garbage.

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

**`cf-cache-status` is stuck on `BYPASS`** — Cloudflare will not cache a response
carrying `Set-Cookie`. Check with
`curl -sI "https://wine.metcalf.dev/" | grep -i set-cookie`. If something comes
back, set the `Cache collection views` rule's Edge TTL to **Ignore cache-control
header and use this TTL**, matching the `s-maxage` in
[lib/cache-control.ts](lib/cache-control.ts); that caches anyway and strips the
header. Safe here because `/` and `/api/wines` are anonymous public reads, and
`/admin` never reaches this rule — the bypass rule above it matches first. **Do
not generalise that setting to a path serving per-user content.**

**`cf-cache-status` says `DYNAMIC`** — the request matched no eligible-for-cache
rule at all. Check the hostname in the expression for a typo, and confirm the
admin bypass is still ordered above the caching rule.

**The page renders as a wall of JSON** — an RSC payload is being served to a
browser navigation, which means the cache key stopped including the query string.
Restore the default cache key on the `Cache collection views` rule. See
[Edge caching](#edge-caching) for why.
