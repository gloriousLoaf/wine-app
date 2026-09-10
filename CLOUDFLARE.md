# Cloudflare dashboard checklist

Everything in this file is dashboard configuration — no code, no deploy. It is
the half of the D1 read-quota fix that lives outside the repo.

Why it matters: these rules stop traffic **at the edge, before the Worker is
invoked**. A request blocked or served from cache costs zero Worker invocations
and zero D1 reads. The code changes make each page view cheap; these rules make
most repeat views free.

Do them in order. Items 1–3 are the ones that matter.

---

## 0. Apply the index migration first

Not a dashboard task, but it must happen before or with the deploy — the code
assumes the indexes exist.

```bash
npx wrangler d1 execute wine-db --file migrations/0001_add_indexes.sql --remote
```

Verify:

```bash
npx wrangler d1 execute wine-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='index'"
```

Expect `idx_wines_date_posted`, `idx_wines_country_date`, `idx_wines_grape_date`,
`idx_wines_vintage_date`. The statements are `IF NOT EXISTS`, so re-running is
safe.

- [ ] Indexes applied to production D1

---

## 1. Cache Rules — the biggest single lever

**Caching → Cache Rules → Create rule**

Cloudflare does not cache HTML or `/api/*` by default. The app now sends
`Cache-Control: public, s-maxage=300, stale-while-revalidate=3600` on the
collection view and the wines API, but nothing honours it until a rule says the
response is eligible for cache.

### Rule A — "Cache collection views"

| Field | Value |
|---|---|
| Expression | `(http.request.uri.path eq "/") or (http.request.uri.path eq "/api/wines")` |
| Cache eligibility | **Eligible for cache** |
| Edge TTL | **Use cache-control header if present**, fallback 5 minutes |
| Browser TTL | Respect origin |

Leave the cache key at its default — it includes the query string, which is what
makes each distinct filter combination cache separately. That is the point: the
crawler hammering `?country=France&grape=Syrah` gets an edge hit on the second
request onward.

### Rule B — "Never cache admin"

Put this **above** Rule A (rules run in order).

| Field | Value |
|---|---|
| Expression | `starts_with(http.request.uri.path, "/admin")` |
| Cache eligibility | **Bypass cache** |

- [ ] Rule B created (admin bypass), ordered first
- [ ] Rule A created (collection + API caching)

> **Known trade-off:** with a 5 minute edge TTL, a wine added or edited in
> `/admin` takes up to 5 minutes to appear on the public homepage. If that
> bothers you, drop the Edge TTL to 60s — still ~98% of the benefit against a
> crawler.

---

## 2. Rate limiting — stops the burst

**Security → WAF → Rate limiting rules → Create rule**

The free plan includes one rate limiting rule. Spend it here.

| Field | Value |
|---|---|
| Name | `Throttle collection browsing` |
| Expression | `(http.request.uri.path eq "/") or starts_with(http.request.uri.path, "/api/")` |
| Characteristics | **IP address** |
| Period | 10 seconds |
| Requests | 20 |
| Action | **Managed Challenge** |
| Duration | 10 seconds |

20 requests / 10s is far above what a human browsing with infinite scroll
generates, and far below what a scraper does. Start with **Managed Challenge**
rather than Block — a challenge is recoverable for a real person on a shared or
mobile IP, a block is not.

- [ ] Rate limiting rule created

---

## 3. Bot controls

**Security → Bots**

- [ ] **Bot Fight Mode** → On
- [ ] **Block AI Scrapers and Crawlers** → On

`public/robots.txt` is already `Disallow: /`, so this changes nothing about
intent — it just enforces it against the crawlers that ignore robots.txt, which
are the ones causing the problem.

> **Note:** Bot Fight Mode issues JS challenges to suspected automated traffic.
> Real browsers pass it. It can break non-browser access to the site (curl,
> RSS-style tooling, uptime monitors) — if you have an uptime check pointed at
> `wine.metcalf.dev`, add a WAF skip rule for its user agent or IP.

---

## 4. Verify it worked

**Workers & Pages → D1 → wine-db → Metrics**

Watch **rows read** over the next 24h. For reference, per page view:

| | Rows read per collection view |
|---|---|
| Before | ~4,400 |
| After indexes + caching (warm isolate) | ~12–24 |
| After an edge cache hit | 0 — never reaches the Worker |

Also useful:

```bash
# Live tail production logs
npx wrangler tail --name wine-app
```

Check the `cf-cache-status` response header on the live site — `HIT` means the
Cache Rule is working:

```bash
curl -sI "https://wine.metcalf.dev/?country=France" | grep -i cf-cache-status
```

The first request is `MISS`, the second should be `HIT`.

- [ ] Rows read confirmed dropping in D1 metrics
- [ ] `cf-cache-status: HIT` on a repeated request

---

## 5. Optional — Turnstile

Only worth doing if items 1–3 leave you still unhappy.

If you want a challenge in front of the expensive paths, the right tool is
[Turnstile](https://developers.cloudflare.com/turnstile/) in **invisible** mode
on `/api/wines` when a `search` param is present — search is the one query that
cannot use an index, so it is the one genuinely expensive path left.

This one does need code. It is not a landing page and not a quiz: a quiz gates
humans and barely inconveniences an agent, whereas invisible Turnstile is
transparent to humans and expensive for automation. That asymmetry is the whole
point of a challenge.
