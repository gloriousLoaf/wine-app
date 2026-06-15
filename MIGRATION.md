# Vercel → Cloudflare Migration Guide

## Context

This app is currently deployed on Vercel (paid tier) with a `wine.metcalf.dev` subdomain served via Cloudflare DNS (CNAME to Vercel, DNS-only). The goal is to move hosting entirely to Cloudflare to eliminate the $20/month Vercel cost.

**Alternative considered:** Downgrading to Vercel free tier ("Hobby"). The bot-crawl issue that drove the upgrade has been patched. Free tier limits (100GB bandwidth, 500MB Blob storage, 1GB Blob transfer) are likely sufficient for this project's actual usage. This is worth trying first as a low-risk fallback.

---

## Current Stack

| Layer | Current | Cloudflare Equivalent |
|---|---|---|
| Hosting | Vercel | Cloudflare Pages (via `@opennextjs/cloudflare`) |
| Database | Turso (LibSQL/SQLite) | No change needed — already Workers-compatible |
| Image storage | Vercel Blob | Cloudflare R2 |
| Analytics | `@vercel/analytics` | Cloudflare Web Analytics (free) or remove |
| DNS | Cloudflare (CNAME to Vercel) | Cloudflare (direct, remove CNAME) |

---

## Compatibility Audit

### No changes needed

- **[app/api/wines/route.ts](app/api/wines/route.ts)** — uses only `NextRequest`/`NextResponse`, fully compatible
- **[lib/db/index.ts](lib/db/index.ts)** — Turso/LibSQL client works in Cloudflare Workers edge environment
- **All server and client components** — no Node.js runtime dependencies anywhere
- **No middleware.ts** — nothing to worry about

### Changes required

| File | Issue | Effort |
|---|---|---|
| [app/admin/actions.ts](app/admin/actions.ts) | `@vercel/blob` `put()` call for image uploads | Medium — swap for R2 via `@aws-sdk/client-s3` |
| [app/layout.tsx](app/layout.tsx) | `@vercel/analytics` import and `<Analytics />` component | Trivial — delete or replace |
| [next.config.ts](next.config.ts) | `remotePatterns` hostname `**.public.blob.vercel-storage.com` | Trivial — update to R2 public bucket URL |

---

## Migration Checklist

### 1. Set up Cloudflare Pages with `@opennextjs/cloudflare`

```bash
npm install -D @opennextjs/cloudflare wrangler
```

Add a `wrangler.jsonc` at the project root and configure `@opennextjs/cloudflare` as the build adapter. See the [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare) for current setup instructions — this adapter has matured significantly and is the recommended approach for Next.js 15+ on Cloudflare.

> **Note:** Next.js must be `>=16.2.6` for `@opennextjs/cloudflare@1.19.x`. The app was bumped from 16.1.1 → 16.2.9 during this step.

> **TODO:** Update `compatibility_date` in `wrangler.jsonc` to the current date before deploying to production. The build warns if this value is stale — it controls which Cloudflare runtime features and fixes are available to the worker.

Test locally with:
```bash
npm run preview
```

### 2. Create R2 bucket and swap image storage

In the Cloudflare dashboard, create an R2 bucket (e.g. `wine-images`). Enable public access to get a public bucket URL.

Install the S3 client:
```bash
npm install @aws-sdk/client-s3
```

In [app/admin/actions.ts](app/admin/actions.ts), replace the `@vercel/blob` import and `put()` call with an R2 upload using `@aws-sdk/client-s3` pointed at your R2 endpoint.

New environment variables needed:
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=wine-images
R2_PUBLIC_URL=https://your-bucket.your-account.r2.dev  # or custom domain
```

Remove from env:
```env
BLOB_READ_WRITE_TOKEN  # no longer needed
```

### 3. Migrate existing images from Vercel Blob to R2

Write a one-time script to list all image URLs stored in the Turso database, fetch each from Vercel Blob, and re-upload to R2. Update the database records with the new R2 URLs.

### 4. Remove `@vercel/analytics`

In [app/layout.tsx](app/layout.tsx), delete the `Analytics` import and component. Optionally add Cloudflare Web Analytics — it's a single `<script>` tag, no npm package needed.

### 5. Update `next.config.ts`

Replace the `vercel-storage.com` entry in `remotePatterns` with your R2 public bucket hostname.

### 6. Update DNS in Cloudflare

Once the Cloudflare Pages project is live:
- Delete the existing `wine` CNAME record pointing to Vercel
- Cloudflare Pages will provide its own DNS records for the `wine.metcalf.dev` subdomain

### 7. Set environment variables in Cloudflare dashboard

```env
TURSO_CONNECTION_URL=
TURSO_AUTH_TOKEN=
ADMIN_PASSWORD=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

---

## R2 Free Tier

R2 is well within free tier for this project:
- 10 GB storage
- 1 million Class A operations/month (writes)
- 10 million Class B operations/month (reads)

---

## Effort Estimate

This is a weekend project. The codebase has zero Node.js runtime dependencies and only one Vercel-specific integration (Blob storage). The `@opennextjs/cloudflare` adapter compatibility risk is low given the simplicity of the route handlers and server actions.
