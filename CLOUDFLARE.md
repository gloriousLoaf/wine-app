# Cloudflare dashboard checklist

Everything in this file is dashboard configuration — no code, no deploy. It is
the half of the D1 read-quota fix that lives outside the repo.

Why it matters: these rules stop traffic **at the edge, before the Worker is
invoked**. A request blocked or served from cache costs zero Worker invocations
and zero D1 reads. The code changes make each page view cheap; these rules make
most repeat views free.

Do them in order. Items 1–3 are the ones that matter.

> ## ⚠️ Read this before creating any rule
>
> **This zone hosts more than the wine app.** `wine.metcalf.dev` is a subdomain
> record inside the `metcalf.dev` zone, and Cloudflare rules are scoped to the
> *zone*, not the subdomain. An expression like `http.request.uri.path eq "/"`
> matches `metcalf.dev/` — the portfolio page — exactly as readily as it matches
> the wine app.
>
> So **every** rule below carries an `http.host eq "wine.metcalf.dev"` predicate.
> Do not drop it. A rate limit without it would throttle the portfolio; a cache
> rule without it would start caching pages this repo does not own.
>
> Two settings in section 3 **cannot** be scoped this way — they are zone-wide
> switches. Those are called out where they appear.

---

## 0. Apply the index migration first ✅ done

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

- [x] Indexes applied to production D1

---

## 1. Cache Rules — the biggest single lever

Cloudflare does not cache HTML or `/api/*` by default. The app already sends a
`Cache-Control` header on the collection view and the wines API (the value lives
in `lib/cache-control.ts`), but nothing honours that until a rule marks the
response eligible for cache. That is what you are creating here.

You will create **two** rules. Order matters: the admin bypass has to be
evaluated first, so create it first.

### Getting to the right screen

1. Go to **https://dash.cloudflare.com** and sign in.
2. On the account home page you get a list of domains. Click **metcalf.dev**.
   (Not "wine.metcalf.dev" — that is a DNS record inside this zone, not a zone
   of its own, so it will not appear in this list. Everything below is scoped to
   the subdomain by the rule expression instead.)
3. In the left sidebar, click **Caching**, then **Cache Rules**.
4. Click **Create rule**.

You are now on the rule builder. It has two halves: **When incoming requests
match…** (the condition) and **Then…** (what to do).

### Rule 1 — "Bypass cache for admin"

Create this one first.

1. **Rule name** — type: `Bypass cache for admin`
2. Under *When incoming requests match…*, select **Custom filter expression**.
3. The form shows Field / Operator / Value dropdowns. Ignore them — click
   **Edit expression** on the right-hand side of that box. It switches to a
   plain text area.
4. Paste this in, exactly:

   ```
   (http.host eq "wine.metcalf.dev" and starts_with(http.request.uri.path, "/admin"))
   ```

5. Under *Then…*, find **Cache eligibility** and select **Bypass cache**.
   Selecting Bypass cache hides the TTL options — that is expected, there is
   nothing else to set on this rule.
6. Click **Deploy**.

### Rule 2 — "Cache collection views"

1. Back on the Cache Rules list, click **Create rule** again.
2. **Rule name** — type: `Cache collection views`
3. **Custom filter expression** → **Edit expression** → paste:

   ```
   (http.host eq "wine.metcalf.dev" and (http.request.uri.path eq "/" or http.request.uri.path eq "/api/wines"))
   ```

4. Under *Then…*:
   - **Cache eligibility** → **Eligible for cache**
   - Selecting that reveals more options. Set **Edge TTL** to
     **Use cache-control header if present, use default Cloudflare caching
     behavior if not**. This is the option that makes Cloudflare honour the
     `s-maxage` the app already sends (set in `lib/cache-control.ts`).
   - Set **Browser TTL** to **Respect origin TTL**.
   - **Leave every other setting alone**, in particular anything under
     **Cache Key**. See the note below — changing the cache key here can break
     the site.
5. Click **Deploy**.

### Check the order

Back on the **Cache Rules** list you should see both rules, and
`Bypass cache for admin` must be **above** `Cache collection views`. Rules are
evaluated top to bottom.

If it is not, drag it up by the handle (the ⠿ dots) at the left of the row and
click **Save** on the ordering prompt.

- [x] Rule 1 created (admin bypass)
- [x] Rule 2 created (collection + API caching)
- [x] Admin bypass is listed **first**

> **Do not enable "Ignore query string" on the cache key.** The default cache key
> includes the query string, and two separate things depend on that.
>
> The obvious one: it is what makes each filter combination cache separately, so
> a crawler hammering `?country=France&grape=Syrah` gets an edge hit from the
> second request onward.
>
> The non-obvious one: Next.js client-side navigations re-request the same path
> with a `?_rsc=<hash>` parameter and receive an RSC payload rather than HTML.
> The query string in the cache key is exactly what keeps those two variants
> under separate keys. Strip it and Cloudflare can serve an RSC payload to a
> normal browser navigation, which renders as a page full of garbage.

> **Leave the Edge TTL long — do not lower it to reduce admin lag.** That was
> the right move before the app purged on its own, and it is now exactly
> backwards.
>
> Adding or editing a wine purges the edge cache for this hostname
> (`purgeEdgeCache()` in `app/admin/actions.ts`), and so does a deploy
> (`scripts/purge-cache.mjs`). Staleness is bounded by those purges, not by the
> TTL — so a *longer* TTL is strictly better, because more crawler traffic is
> absorbed at the edge and never reaches the Worker or D1. Shortening it would
> throw that away and buy nothing.

---

## 2. Rate limiting — stops the burst

The free plan includes exactly one rate limiting rule. Spend it here.

1. From the **metcalf.dev** zone, left sidebar → **Security**.
2. Click **WAF**, then the **Rate limiting rules** tab.
3. Click **Create rule**.
4. **Rule name** — type: `Throttle wine app browsing`
5. Under *When incoming requests match…*, click **Edit expression** and paste:

   ```
   (http.host eq "wine.metcalf.dev" and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/api/")))
   ```

6. **With the same characteristics…** — this is how Cloudflare decides who "the
   same client" is. Leave it at **IP address**.
7. **When rate exceeds…**
   - **Requests**: `20`
   - **Period**: `10 seconds`
8. **Then take action…**
   - **Action**: **Managed Challenge**
   - **Duration** (labelled *Mitigation timeout*): `10 seconds`
9. Click **Deploy**.

20 requests / 10s is far above what a human browsing with infinite scroll
generates, and far below what a scraper does. Use **Managed Challenge** rather
than **Block** — a challenge is recoverable for a real person on a shared or
mobile IP, a block is not.

- [x] Rate limiting rule created, scoped to `wine.metcalf.dev`

---

## 3. Bot controls

This section has two halves because **Bot Fight Mode is a zone-wide switch with
no hostname filter**. It cannot be limited to the wine app. The AI-crawler
blocking is therefore done as a scoped WAF rule instead of with Cloudflare's
zone-wide AI toggle, so that `metcalf.dev` stays readable to AI assistants — a
portfolio benefits from being found, the wine app does not.

### 3a. Bot Fight Mode (zone-wide — affects metcalf.dev too)

1. From the **metcalf.dev** zone, left sidebar → **Security**, then **Bots**.
2. Turn **Bot Fight Mode** on.

This one is deliberately left zone-wide. It only challenges traffic already
scored as automated, so a static portfolio is barely affected.

Leave **Block AI Scrapers and Crawlers** *off* — that is the toggle that would
also cut AI crawlers off from `metcalf.dev`. Rule 3b replaces it, scoped.

> **Note:** Bot Fight Mode issues JS challenges to suspected automated traffic.
> Real browsers pass it. It can break non-browser access (curl, RSS-style
> tooling, uptime monitors) across the **whole zone** — if you have an uptime
> check pointed at either hostname, add a WAF skip rule for its user agent or IP.

### 3b. Block AI crawlers on the wine app only

1. Left sidebar → **Security** → **WAF**, then the **Custom rules** tab.
2. Click **Create rule**.
3. **Rule name** — type: `Block AI crawlers on wine app`
4. Click **Edit expression** and paste:

   ```
   (http.host eq "wine.metcalf.dev") and (http.user_agent contains "GPTBot" or http.user_agent contains "ClaudeBot" or http.user_agent contains "CCBot" or http.user_agent contains "Bytespider" or http.user_agent contains "PerplexityBot" or http.user_agent contains "meta-externalagent" or http.user_agent contains "Amazonbot" or http.user_agent contains "Applebot-Extended" or http.user_agent contains "Google-Extended")
   ```

5. **Action** → **Block**.
6. Click **Deploy**.

The free plan allows 5 custom rules, so this costs one of five.

`public/robots.txt` is already `Disallow: /` for the wine app, so this changes
nothing about intent — it just enforces that against crawlers that ignore
robots.txt, which are the ones causing the problem. The list is user-agent
matching, so it is maintenance: add to it if a new crawler shows up in your logs.

- [x] Bot Fight Mode on (zone-wide)
- [x] "Block AI Scrapers and Crawlers" left **off**
- [x] AI-crawler custom rule created, scoped to `wine.metcalf.dev`

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

Check the `cf-cache-status` response header on the live site. Run all four —
the last one is the point of all the hostname scoping:

```bash
# 1 + 2. Wine app: first request MISS, second should be HIT
curl -sI "https://wine.metcalf.dev/?country=France" | grep -i cf-cache-status
curl -sI "https://wine.metcalf.dev/?country=France" | grep -i cf-cache-status

# 3. Admin must never cache — expect BYPASS (or DYNAMIC)
curl -sI "https://wine.metcalf.dev/admin" | grep -i cf-cache-status

# 4. Portfolio must be untouched by any of these rules —
#    expect whatever it returned before you started, NOT a fresh HIT/MISS
curl -sI "https://metcalf.dev/" | grep -i cf-cache-status
```

- [ ] Rows read confirmed dropping in D1 metrics
- [ ] `cf-cache-status: HIT` on a repeated request to the wine app
- [ ] `/admin` shows BYPASS
- [ ] `metcalf.dev` behaviour unchanged

---

## Troubleshooting

**`cf-cache-status` never gets past `MISS`, or is stuck on `BYPASS`.**

The two causes below produce an identical symptom and neither is guessable.

*1. A `Set-Cookie` on the response.* Cloudflare will not cache a response that
carries one. Check:

```bash
curl -sI "https://wine.metcalf.dev/" | grep -i set-cookie
```

If something comes back, edit the `Cache collection views` rule and change
**Edge TTL** to **Ignore cache-control header and use this TTL**, set to match
the `s-maxage` in `lib/cache-control.ts` (1 hour). That forces caching and strips
the header on the way out.

This is safe *here* specifically because `/` and `/api/wines` are anonymous
public reads with no per-visitor state — and `/admin`, which does have state,
never reaches this rule because the bypass rule above it matches first. Do not
generalise this setting to a path that serves per-user content.

*2. The rule is not matching at all.* If the header says `DYNAMIC`, the request
never matched an eligible-for-cache rule. Check the expression for a typo in the
hostname, and confirm rule order on the Cache Rules list — if the admin bypass
somehow matches `/`, everything bypasses.

**The page renders as a wall of text/JSON after enabling caching.**

That is an RSC payload being served to a browser navigation. It means the cache
key stopped including the query string. Re-check the `Cache Key` settings on the
`Cache collection views` rule and make sure query strings are included (the
default). See the note in section 1.

**A rule will not save — "Expression is invalid".**

The expression box is strict about quoting. Every string value needs straight
double quotes (`"wine.metcalf.dev"`, not curly quotes), and the parentheses have
to balance. Pasting from a rendered version of this file can substitute smart
quotes — paste from the raw Markdown if that happens.

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
