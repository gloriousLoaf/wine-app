declare global {
  interface CloudflareEnv {
    wine_db: D1Database;
    /** Set with `wrangler secret put ADMIN_PASSWORD`, or in `.dev.vars` locally. */
    ADMIN_PASSWORD?: string;
  }
}
export {};
