# Vercel → Cloudflare Migration Guide

## Context

This app was deployed on Vercel (paid tier) with a `wine.metcalf.dev` subdomain served via Cloudflare DNS (CNAME to Vercel, DNS-only). The goal is to move hosting entirely to Cloudflare to eliminate the $20/month Vercel cost.

**Alternative considered:** Downgrading to Vercel free tier ("Hobby"). The bot-crawl issue that drove the upgrade has been patched. Free tier limits (100GB bandwidth, 500MB Blob storage, 1GB Blob transfer) are likely sufficient for actual usage. Worth trying first as a low-risk fallback.

---

## Stack Changes

| Layer | Before | After |
|---|---|---|
| Hosting | Vercel | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| Database | Turso (LibSQL/SQLite) | Turso (unchanged) — see D1 note below |
| Image storage | Vercel Blob | Cloudflare R2 |
| Analytics | `@vercel/analytics` | Removed |
| DNS | Cloudflare CNAME → Vercel | Cloudflare direct (Workers route) |

### On Turso vs Cloudflare D1

Cloudflare D1 is their native SQLite, bound directly to the Worker (no HTTP connection, no auth tokens). Drizzle supports it via `drizzle-orm/d1`. For a read-heavy personal app with no multi-region replication need, D1 is the simpler long-term choice. Migration would require exporting Turso data, creating a D1 binding, and swapping the Drizzle adapter. Worth doing if Turso compatibility issues persist.

---

## Compatibility Audit

### No changes needed (confirmed)

- **[app/api/wines/route.ts](app/api/wines/route.ts)** — uses only `NextRequest`/`NextResponse`, fully compatible
- **All server and client components** — no Node.js runtime dependencies anywhere
- **No middleware.ts** — nothing to worry about

### Changes made

| File | Change |
|---|---|
| [app/admin/actions.ts](app/admin/actions.ts) | Replaced `@vercel/blob` with `@aws-sdk/client-s3` pointing at R2 |
| [app/layout.tsx](app/layout.tsx) | Removed `@vercel/analytics` import and `<Analytics />` |
| [next.config.ts](next.config.ts) | `remotePatterns` now reads `R2_PUBLIC_URL` from env; keeps Vercel Blob pattern during transition |
| [lib/db/index.ts](lib/db/index.ts) | Lazy-init Proxy for db client (see gotchas); import changed to `@libsql/client/web` |

### TODO before cancelling Vercel

- [ ] **DNS cutover** — add `wine.metcalf.dev` as a custom domain on the Worker (Cloudflare dashboard → Workers & Pages → wine-app → Settings → Domains & Routes → Add Custom Domain). The Vercel CNAME can then be deleted.
- [ ] **Remove Vercel Blob `remotePattern`** — delete the `**.public.blob.vercel-storage.com` entry from `next.config.ts` now that all images are on R2.
- [ ] **Confirm auto-deploy** — there is no `.github/workflows/deploy.yml` yet. If the Cloudflare dashboard Git integration is working, verify a push to `main` triggers a deploy. If not, add the workflow from Step 6 below.

---

## Migration Checklist

### 1. Set up `@opennextjs/cloudflare` adapter

```bash
npm install -D @opennextjs/cloudflare wrangler
```

This deploys as a **Cloudflare Worker** (not Pages). The `wrangler.jsonc` uses `main` + `assets` binding — the Workers + Assets model. Do not set up a Cloudflare Pages project; use `npm run deploy` or GitHub Actions instead.

> **Note:** Next.js must be `>=16.2.6` for `@opennextjs/cloudflare@1.19.x`. Bumped from 16.1.1 → 16.2.9.

> **TODO (done):** Update `compatibility_date` in `wrangler.jsonc` to deploy date. Set to `2026-06-17`.

New scripts added to `package.json`:
```json
"build:worker": "opennextjs-cloudflare build",
"preview":      "opennextjs-cloudflare build && wrangler dev",
"deploy":       "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

### 2. Create R2 bucket and swap image storage

Create R2 bucket (`wine-images`), enable public access. Install `@aws-sdk/client-s3`.

Update [app/admin/actions.ts](app/admin/actions.ts) to upload via `PutObjectCommand` to R2.

New env vars:
```env
R2_ACCOUNT_ID        # hex segment from the S3 endpoint URL (before .r2.cloudflarestorage.com)
R2_ACCESS_KEY_ID     # "Access Key ID" from R2 API token page
R2_SECRET_ACCESS_KEY # "Secret Access Key" from R2 API token page
R2_BUCKET_NAME       # wine-images
R2_PUBLIC_URL        # https://pub-xxx.r2.dev (from bucket Settings > Public access)
```

> The "Token value" shown on R2 token creation is for Cloudflare's own API — ignore it. Use Access Key ID + Secret Access Key for the S3-compatible API.

### 3. Migrate existing images to R2

**Vercel Blob → R2** (1162 wines): fetches each Vercel Blob URL from the DB, uploads to R2, updates `imagePath` in Turso. Idempotent; safe to re-run.

```bash
npx tsx scripts/migrate-blob-to-r2.ts
```

**CloudFront → R2** (6 wines from old Delectable scrape data): some wines had `imagePath` pointing to a CloudFront CDN. Same pattern — fetches, uploads, updates `imagePath`.

```bash
npx tsx scripts/migrate-cloudfront-to-r2.ts
```

Both scripts skip wines already pointing to R2. Run them in sequence; failures are collected and printed as a summary at the end so you don't have to scroll.

Once confirmed, remove the `**.public.blob.vercel-storage.com` entry from `next.config.ts` remotePatterns.

### 4. Remove `@vercel/analytics`

Delete `Analytics` import and `<Analytics />` from [app/layout.tsx](app/layout.tsx). Uninstall `@vercel/analytics`.

### 5. Set environment variables on the Worker

**Do not rely on the Cloudflare dashboard Variables UI** — those variables were not reaching the Worker in testing (possibly a UI quirk vs. actual binding). Use `wrangler secret put` instead:

```bash
npx wrangler secret put TURSO_CONNECTION_URL --name wine-app
npx wrangler secret put TURSO_AUTH_TOKEN --name wine-app
npx wrangler secret put ADMIN_PASSWORD --name wine-app
npx wrangler secret put R2_ACCOUNT_ID --name wine-app
npx wrangler secret put R2_ACCESS_KEY_ID --name wine-app
npx wrangler secret put R2_SECRET_ACCESS_KEY --name wine-app
npx wrangler secret put R2_BUCKET_NAME --name wine-app
npx wrangler secret put R2_PUBLIC_URL --name wine-app
```

Secrets take effect immediately — no redeploy needed.

### 6. Set up GitHub Actions for auto-deploy

The Workers model does not have the same push-to-deploy Git integration as Cloudflare Pages. Use a GitHub Action instead:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets.

### 7. Update DNS in Cloudflare

Once the Worker is confirmed working:
- Delete the `wine` CNAME record pointing to Vercel
- Add a route or custom domain on the Worker pointing to `wine.metcalf.dev`

---

## Gotchas Encountered

### Workers vs Pages
`@opennextjs/cloudflare` v1.x deploys to **Workers** (not Pages). The `wrangler.jsonc` uses `main` + `assets` binding. If you set up a Cloudflare Pages project via the dashboard, it will partially work (static assets) but 500 on all dynamic routes. Deploy via CLI or GitHub Actions.

### Environment variables not reaching the Worker
Variables set via the Cloudflare dashboard UI did not appear in `process.env` inside the Worker during testing — `populateProcessEnv()` in the adapter iterates `env` but received an empty object. Root cause unclear (possibly variables were on a deleted Pages project). Fix: use `wrangler secret put` to bind variables directly.

### Lazy DB initialization required
`lib/db/index.ts` originally created the libsql client at module load time. In Workers, `process.env` is populated by `populateProcessEnv()` on the first request — module-level code runs before this. Fix: wrapped the db in a lazy-init Proxy that defers `createClient()` until first use.

### `@libsql/client` import
Must import from `@libsql/client/web` (not `@libsql/client`) — the standard import uses the Node.js client which misbehaves with `nodejs_compat`. Cloudflare's own docs confirm this.

### `@libsql/client` v0.17.0 bug
v0.17.0 throws `Cannot read properties of null (reading 'has')` on query execution in the Workers runtime. Fixed by upgrading to v0.17.4.

### `TURSO_CONNECTION_URL` scheme
Must use `https://` (HTTP mode), not `libsql://` (WebSocket/Hrana). Change the scheme in the secret:
`libsql://your-db.turso.io` → `https://your-db.turso.io`

---

## R2 Free Tier

- 10 GB storage
- 1 million Class A operations/month (writes)
- 10 million Class B operations/month (reads)
