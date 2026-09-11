#!/usr/bin/env node
/**
 * Purge the Cloudflare edge cache for the public site.
 *
 * Run after a deploy. The admin write actions purge on their own (see
 * purgeEdgeCache() in app/admin/actions.ts), but a *deploy* does not — so a
 * release that changes the markup of the collection view would otherwise serve
 * the previous HTML until the edge TTL expired.
 *
 *   node scripts/purge-cache.mjs [hostname]
 *
 * Reads CLOUDFLARE_ZONE_ID and CLOUDFLARE_PURGE_TOKEN from the environment.
 * These are *build-time* variables — the `wrangler secret put` values of the
 * same name are runtime-only and are not visible here.
 *
 * Exit codes:
 *   0  purged, or skipped because it is not configured (a warning is printed)
 *   1  the purge was attempted and failed
 *
 * A non-zero exit marks the build red on purpose: a stale edge cache is exactly
 * the problem this exists to prevent, so it should be loud. The Worker itself
 * has already deployed by this point — see the failure message.
 */

// Keep in sync with PURGE_HOSTNAME in app/admin/actions.ts, which does the same
// purge at runtime after an admin write.
const DEFAULT_HOSTNAME = 'wine.metcalf.dev';

const hostname = process.argv[2] || process.env.PURGE_HOSTNAME || DEFAULT_HOSTNAME;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const token = process.env.CLOUDFLARE_PURGE_TOKEN;

if (!zoneId || !token) {
  const missing = [
    !zoneId && 'CLOUDFLARE_ZONE_ID',
    !token && 'CLOUDFLARE_PURGE_TOKEN',
  ].filter(Boolean);

  console.warn(
    `⚠ Skipping edge cache purge — ${missing.join(' and ')} not set.\n` +
      `  The deploy succeeded, but cached pages for ${hostname} may serve stale\n` +
      `  HTML until the edge TTL expires. Set these as build variables, or purge\n` +
      `  by hostname from the Cloudflare dashboard.`
  );
  process.exit(0);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hosts: [hostname] }),
  }
).catch((error) => {
  console.error(`✗ Edge cache purge could not reach Cloudflare: ${error.message}`);
  console.error('  The Worker deployed successfully — only the purge failed.');
  console.error(`  Purge ${hostname} by hostname from the dashboard.`);
  process.exit(1);
});

const body = await response.json().catch(() => null);

if (!response.ok || !body?.success) {
  // Cloudflare returns 200 with success:false for some rejections, so check both.
  const detail = body?.errors?.map((e) => `${e.code}: ${e.message}`).join('; ');

  console.error(`✗ Edge cache purge failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`);
  console.error('  The Worker deployed successfully — only the purge failed.');

  // Which of the two values is wrong is the first thing you want to know, and
  // Cloudflare's own message does not say. Narrow it by status code.
  if (response.status === 401 || response.status === 403) {
    console.error('  → Suspect CLOUDFLARE_PURGE_TOKEN: wrong value, or the token');
    console.error('    lacks Zone → Cache Purge → Purge on this zone.');
  } else if (response.status === 400 || response.status === 404) {
    // Not a credential — printing it is how you spot a typo.
    console.error(`  → Suspect CLOUDFLARE_ZONE_ID: got "${zoneId}".`);
  }

  console.error('  Both are *build* variables (Settings → Build → Variables and');
  console.error('  Secrets). The `wrangler secret put` values of the same name are');
  console.error('  runtime-only and are not visible to this script.');
  console.error('  Check them with:  npm run purge');
  console.error(`  Or purge by hand: Caching → Configuration → Purge Cache →`);
  console.error(`  Custom Purge → Hostname → ${hostname}`);
  process.exit(1);
}

console.log(`✓ Purged Cloudflare edge cache for ${hostname}`);
