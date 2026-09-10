import type { Config } from 'drizzle-kit';

/**
 * Used for generating migration SQL from lib/db/schema.ts:
 *
 *   npx drizzle-kit generate
 *
 * Migrations are applied to D1 with wrangler rather than by drizzle-kit, so no
 * database credentials are needed here:
 *
 *   npx wrangler d1 execute wine-db --file migrations/<file>.sql            # local
 *   npx wrangler d1 execute wine-db --file migrations/<file>.sql --remote   # production
 */
export default {
  schema: './lib/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
} satisfies Config;
