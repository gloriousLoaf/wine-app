import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { wines } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const connectionUrl = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

if (!connectionUrl || !authToken || !r2AccountId || !r2AccessKey || !r2SecretKey || !r2BucketName || !r2PublicUrl) {
  console.error('❌ Missing environment variables. Check .env');
  process.exit(1);
}

const dbClient = createClient({ url: connectionUrl, authToken });
const db = drizzle(dbClient);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

async function migrate() {
  console.log('🚀 Starting Vercel Blob → R2 migration...');

  const allWines = await db.select().from(wines);
  console.log(`📦 Found ${allWines.length} wines in database.`);

  const blobWines = allWines.filter(w => w.imagePath?.includes('vercel-storage.com'));
  console.log(`🖼️  Detected ${blobWines.length} wines with Vercel Blob images.`);

  if (blobWines.length === 0) {
    console.log('✅ No Vercel Blob images found — nothing to migrate.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  const failures: { id: number; title: string; error: string }[] = [];

  for (const wine of blobWines) {
    if (wine.imagePath?.includes(r2PublicUrl!)) {
      console.log(`  ⏭️  Already on R2: ${wine.title}`);
      skipCount++;
      continue;
    }

    try {
      const res = await fetch(wine.imagePath!);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${wine.imagePath}`);

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const key = wine.imageTitle || wine.imagePath!.split('/').pop()!;

      await r2.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: new Uint8Array(buffer),
        ContentType: contentType,
      }));

      const newUrl = `${r2PublicUrl}/${key}`;
      await db.update(wines)
        .set({ imagePath: newUrl })
        .where(eq(wines.id, wine.id));

      console.log(`  ✅ [${successCount + failures.length + skipCount + 1}/${blobWines.length}] ${wine.title}`);
      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed: [id=${wine.id}] ${wine.title} — ${message}`);
      failures.push({ id: wine.id, title: wine.title, error: message });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n--- Migration Summary ---');
  console.log(`✅ Migrated:  ${successCount}`);
  console.log(`⏭️  Skipped:   ${skipCount}`);
  console.log(`❌ Failed:    ${failures.length}`);
  if (failures.length > 0) {
    console.log('\nFailed wines:');
    for (const f of failures) {
      console.log(`  [id=${f.id}] ${f.title} — ${f.error}`);
    }
  }
  console.log('-------------------------\n');
}

migrate().catch(console.error);
