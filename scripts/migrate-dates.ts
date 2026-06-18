import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { wines } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const connectionUrl = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!connectionUrl || !authToken) {
  console.error('❌ Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = drizzle(createClient({ url: connectionUrl, authToken }));

async function migrateDates() {
  console.log('🍷 Starting Date Migration...');

  try {
    const allWines = await db.select().from(wines);
    console.log(`Found ${allWines.length} wines to migrate.`);

    let successCount = 0;

    for (const wine of allWines) {
      if (!wine.datePosted) {
        await db.update(wines)
          .set({ datePosted: wine.isoCreatedAt })
          .where(eq(wines.id, wine.id));
        successCount++;
        console.log(`  ✅ Migrated: [${wine.id}] ${wine.title} -> ${wine.isoCreatedAt}`);
      }
    }

    console.log(`\n🎉 Migration complete! ${successCount} entries updated.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateDates();
