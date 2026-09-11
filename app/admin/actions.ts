'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '../../lib/db';
import { wines } from '../../lib/db/schema';
import { getFilterMetadata, getWinesForEdit } from '../../lib/db/repo';
import { invalidateCollectionCache } from '../../lib/db/cache';
import { revalidatePath } from 'next/cache';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
import { eq } from 'drizzle-orm';

/** Length-independent comparison, so the check does not leak the password by timing. */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

type SecretName = 'ADMIN_PASSWORD' | 'CLOUDFLARE_ZONE_ID' | 'CLOUDFLARE_PURGE_TOKEN';

/**
 * Read a secret from the Worker binding, falling back to process.env.
 *
 * In production OpenNext mirrors the Worker env onto process.env, but under
 * `next dev` the platform proxy only exposes `.dev.vars` through the Cloudflare
 * context — so reading process.env alone makes admin unusable locally.
 */
function readSecret(name: SecretName): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const value = env?.[name];
    if (value) return value;
  } catch {
    // No Cloudflare context (e.g. outside a request) — fall through.
  }
  return process.env[name] || undefined;
}

/**
 * Single gate for every admin operation, read or write.
 *
 * Reads used to be ungated: /admin/edit ran its queries during server render
 * with no check at all, so anyone who guessed the URL could spend ~2 full table
 * scans per request. Everything that touches D1 from /admin now goes through
 * here first.
 */
function isAdmin(password: FormDataEntryValue | null): boolean {
  const expected = readSecret('ADMIN_PASSWORD');
  if (!expected || typeof password !== 'string') return false;
  return constantTimeEquals(password, expected);
}

/** The public hostname whose edge cache is purged after a write. */
const PURGE_HOSTNAME = 'wine.metcalf.dev';

/**
 * Purge the Cloudflare edge cache for the public site after a write.
 *
 * The collection views are cached at the edge with a long TTL (see
 * lib/cache-control.ts), so without this an added or edited wine would not
 * appear until that TTL expired. Purging is what lets the TTL be long, which is
 * what keeps crawler traffic off the Worker.
 *
 * Purging by *hostname* rather than by URL is deliberate: the cache key includes
 * the query string, so every filter combination — and every Next.js `_rsc`
 * variant of each — is its own cache entry. There is no practical URL list to
 * enumerate, and single-URL purge does not accept wildcards.
 *
 * Failure is logged and swallowed. The write has already committed; a purge that
 * did not go through is a staleness problem, not a reason to tell the admin
 * their edit failed.
 */
async function purgeEdgeCache(): Promise<void> {
  const zoneId = readSecret('CLOUDFLARE_ZONE_ID');
  const token = readSecret('CLOUDFLARE_PURGE_TOKEN');

  // Not configured (local dev, or no token set) — nothing to do.
  if (!zoneId || !token) return;

  const purge = fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hosts: [PURGE_HOSTNAME] }),
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error('Edge cache purge failed:', response.status, await response.text());
      }
    })
    .catch((error: unknown) => {
      console.error('Edge cache purge error:', error);
    });

  try {
    // Don't hold the admin's response open for a round trip to Cloudflare.
    getCloudflareContext().ctx.waitUntil(purge);
  } catch {
    // No Cloudflare context to defer onto — just wait for it.
    await purge;
  }
}

const UNAUTHORIZED = { success: false as const, message: 'Unauthorized: Incorrect password' };

/**
 * Fetch the edit list. Called from the client only after a password is entered,
 * which is what keeps the queries behind the gate.
 */
export async function loadWinesForEdit(formData: FormData) {
  try {
    if (!isAdmin(formData.get('password'))) return UNAUTHORIZED;

    const search = formData.get('search');
    const [editableWines, filters] = await Promise.all([
      getWinesForEdit(typeof search === 'string' ? search : undefined),
      getFilterMetadata(),
    ]);

    return {
      success: true as const,
      wines: editableWines.map((wine) => ({
        id: wine.id,
        title: wine.title,
        producer: wine.producer,
        vintage: wine.vintage,
        notes: wine.notes,
        country: wine.country,
        grape: wine.grape,
        datePosted: wine.datePosted,
      })),
      countries: filters.countries,
      grapes: filters.grapes,
    };
  } catch (error: unknown) {
    console.error('Failed to load wines for edit:', error);
    return {
      success: false as const,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function editWineMetadata(formData: FormData) {
  try {
    if (!isAdmin(formData.get('password'))) return UNAUTHORIZED;

    const id = parseInt(formData.get('id') as string, 10);
    const title = formData.get('title') as string | null;
    const producer = formData.get('producer') as string | null;
    const vintage = formData.get('vintage') as string | null;
    const notes = formData.get('notes') as string | null;
    const country = formData.get('country') as string | null;
    const grape = formData.get('grape') as string | null;
    const datePosted = formData.get('datePosted') as string | null;

    if (isNaN(id)) {
      return { success: false, message: 'Invalid wine ID' };
    }

    if (!title || !producer || !vintage || !datePosted) {
      return { success: false, message: 'Missing required string fields.' };
    }

    await getDb().update(wines)
      .set({
        title,
        producer,
        vintage,
        notes: notes || null,
        country,
        grape,
        datePosted
      })
      .where(eq(wines.id, id));

    invalidateCollectionCache();
    await purgeEdgeCache();
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to edit wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
}

export async function deleteWine(formData: FormData) {
  try {
    if (!isAdmin(formData.get('password'))) return UNAUTHORIZED;

    const id = parseInt(formData.get('id') as string, 10);
    if (isNaN(id)) {
      return { success: false, message: 'Invalid wine ID' };
    }

    // Hard delete from DB. (Images in R2 are kept as orphans for simplicity, or we could delete them if we stored the URL string. Leaving object deletion out to prevent accidental wipe of shared assets).
    await getDb().delete(wines).where(eq(wines.id, id));

    invalidateCollectionCache();
    await purgeEdgeCache();
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
}

export async function addWine(formData: FormData) {
  try {
    if (!isAdmin(formData.get('password'))) return UNAUTHORIZED;

    const producer = formData.get('producer') as string;
    const title = formData.get('title') as string;
    const vintage = formData.get('vintage') as string;
    const notes = formData.get('notes') as string;
    const country = formData.get('country') as string || null;
    const grape = formData.get('grape') as string || null;
    const imageFile = formData.get('imageFile') as File;

    let imagePath = '';
    let imageTitle = '';

    if (imageFile && imageFile.size > 0) {
      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: imageFile.name,
        Body: new Uint8Array(await imageFile.arrayBuffer()),
        ContentType: imageFile.type,
      }));
      imagePath = `${process.env.R2_PUBLIC_URL}/${imageFile.name}`;
      imageTitle = imageFile.name;
    }

    await getDb().insert(wines).values({
      producer,
      title,
      vintage,
      notes,
      country,
      grape,
      imageTitle,
      imagePath,
      isoCreatedAt: new Date().toISOString(),
    });

    invalidateCollectionCache();
    await purgeEdgeCache();
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to add wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred during upload.' };
  }
}
