declare global {
  interface CloudflareEnv {
    wine_db: D1Database;
    /** Set with `wrangler secret put ADMIN_PASSWORD`, or in `.dev.vars` locally. */
    ADMIN_PASSWORD?: string;
    /** Zone ID for metcalf.dev — purge target after admin writes. */
    CLOUDFLARE_ZONE_ID?: string;
    /** API token scoped to Zone → Cache Purge → Purge on that zone only. */
    CLOUDFLARE_PURGE_TOKEN?: string;
  }
}
export {};
