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

/**
 * Read the admin secret from the Worker binding, falling back to process.env.
 *
 * In production OpenNext mirrors the Worker env onto process.env, but under
 * `next dev` the platform proxy only exposes `.dev.vars` through the Cloudflare
 * context — so reading process.env alone makes admin unusable locally.
 */
function adminPassword(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    if (env?.ADMIN_PASSWORD) return env.ADMIN_PASSWORD;
  } catch {
    // No Cloudflare context (e.g. outside a request) — fall through.
  }
  return process.env.ADMIN_PASSWORD || undefined;
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
  const expected = adminPassword();
  if (!expected || typeof password !== 'string') return false;
  return constantTimeEquals(password, expected);
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
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to add wine:', error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred during upload.' };
  }
}
