import { put } from '@vercel/blob';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { wines } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const connectionUrl = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!connectionUrl || !authToken || !blobToken) {
  console.error('❌ Missing environment variables. Please check .env');
  process.exit(1);
}

const client = createClient({ url: connectionUrl, authToken });
const db = drizzle(client);

const IMAGES_DIR = path.join(process.cwd(), 'delectable', 'wine_images');

async function migrate() {
  console.log('🚀 Starting Vercel Blob migration...');

  const allWines = await db.select().from(wines);
  console.log(`📦 Found ${allWines.length} wines in database.`);

  const localWines = allWines.filter(w => w.imagePath?.startsWith('/images/wines/'));
  console.log(`🖼️  Detected ${localWines.length} wines using local images.`);

  if (localWines.length === 0) {
    console.log('✅ No local images found to migrate.');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // Process one by one to avoid rate limits on the free tier
  for (const wine of localWines) {
    // Skip if already a blob URL (idempotency)
    if (wine.imagePath?.includes('vercel-storage.com')) {
      console.log(`  ⏭️  Already migrated: ${wine.title}`);
      successCount++;
      continue;
    }

    const fileName = wine.imageTitle;
    const filePath = path.join(IMAGES_DIR, fileName!);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  File not found on disk: ${fileName}. Skipping.`);
      skipCount++;
      continue;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let migrated = false;

    while (retryCount < maxRetries && !migrated) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = await put(fileName!, fileBuffer, {
          access: 'public',
          token: blobToken,
          addRandomSuffix: false,
          allowOverwrite: true,
        });

        // Update database with new blob URL
        await db.update(wines)
          .set({ imagePath: blob.url })
          .where(eq(wines.id, wine.id));

        console.log(`  ✅ [${successCount + failCount + skipCount + 1}/${localWines.length}] Migrated: ${wine.title}`);
        successCount++;
        migrated = true;
      } catch (error: any) {
        if (error.retryAfter) {
          const wait = (error.retryAfter + 1) * 1000;
          console.warn(`  ⏳ Rate limited. Waiting ${error.retryAfter + 1}s...`);
          await new Promise(resolve => setTimeout(resolve, wait));
          retryCount++;
        } else {
          console.error(`  ❌ Failed to migrate ${wine.title}:`, error.message);
          failCount++;
          break;
        }
      }
    }
    
    if (!migrated && retryCount >= maxRetries) {
      console.error(`  ❌ Failed to migrate ${wine.title} after ${maxRetries} retries.`);
      failCount++;
    }

    // Small delay between requests even if not rate limited
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n--- Migration Summary ---');
  console.log(`✅ Successfully Migrated: ${successCount}`);
  console.log(`⚠️  Skipped (Not on disk): ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('-------------------------\n');
}

migrate().catch(console.error);
